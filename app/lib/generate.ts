import "server-only";
import { generateText, MODELS } from "@/lib/ai";
import { getDefaultModel } from "@/lib/settings";
import { methodology, getSection, getPillarOf, readsOf, canGenerate } from "@/lib/methodology";
import { sectionGuide } from "@/lib/guide";
import { getProject, getSectionRow, getSections, filledKeys } from "@/lib/queries";
import { extractJson } from "@/lib/json";
import { getSectionPrompt } from "@/lib/prompts";

export type GenerateResult = {
  values: Record<string, unknown>;
  reads: string[]; // upstream sections actually fed to the model (provenance)
  model: string;
};

function isNonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

// Input-kind steps the AI may PROPOSE like a synthesis step: they're marked
// "input" because the owner decides, but their content is legitimately
// derivable from the strategy (brainstorms and preferences, not facts).
const PROPOSABLE_INPUTS = new Set([
  "naming.constraints",
  "naming.phonetic-profile",
  "naming.exploration",
  "communication.deferred",
]);

// Reality/Identity inputs hold facts only the owner knows. The AI never invents
// those — but it may STRUCTURE the owner's own words already on file (Quick
// Start drafts, rough notes, neighboring answers) into the step's format.
function isOwnWordsInput(sectionKey: string): boolean {
  const pillar = getPillarOf(sectionKey);
  return pillar?.id === "reality" || pillar?.id === "identity";
}

// The owner's words on file: any filled Reality/Identity section besides this one.
function ownWordsOnFile(projectId: string, sectionKey: string): boolean {
  return [...filledKeys(projectId)].some(
    (k) => k !== sectionKey && (k.startsWith("reality.") || k.startsWith("identity."))
  );
}

// Server-side generation gate — the client UI mirrors this, but the API is the
// authority. Returns a user-facing reason when generation must not run:
//  - steps that record real-world RESULTS or ACTIONS (domain registrations)
//    are never AI-written; those steps have dedicated tools instead;
//  - Reality/Identity inputs draft only from the owner's own words on file;
//  - synthesis steps need something real to build on: all declared reads (the
//    dependency pipeline), the owner's own notes, or — for Reality/Identity
//    foundation steps — at least one filled upstream answer.
export function generationBlockedReason(
  projectId: string,
  sectionKey: string,
  rough: Record<string, unknown>
): string | null {
  const section = getSection(sectionKey);
  if (!section) return `Unknown section: ${sectionKey}`;
  const isDerived =
    section.kind === "synthesis" || section.kind === "partial" || PROPOSABLE_INPUTS.has(sectionKey);
  if (!isDerived) {
    if (isOwnWordsInput(sectionKey)) {
      if (Object.values(rough ?? {}).some(isNonEmpty)) return null;
      if (ownWordsOnFile(projectId, sectionKey)) return null;
      return "This step records facts about your business, so the AI needs your words to work from — jot a few rough notes below, or run the Quick Start first.";
    }
    return "This step records a real-world action or result, so it can't be AI-written — it's yours to log.";
  }
  const filled = filledKeys(projectId);
  if (canGenerate(sectionKey, filled)) return null;
  if (Object.values(rough ?? {}).some(isNonEmpty)) return null;
  const pillar = getPillarOf(sectionKey);
  if ((pillar?.id === "reality" || pillar?.id === "identity") && (section.reads ?? []).some((r) => filled.has(r)))
    return null;
  if (PROPOSABLE_INPUTS.has(sectionKey) && filled.size > 0) return null;
  const missing = (section.reads ?? [])
    .filter((r) => !filled.has(r))
    .map((r) => getSection(r)?.name ?? r);
  return `There's nothing to build this from yet — fill in ${missing.join(", ")} first, or add a few notes of your own.`;
}

// One static system prompt for every generation call: the strategist role plus a
// compact map of the whole methodology. Identical across projects and sections,
// so prompt caching turns it into a one-time cost (per 5-min window).
const STATIC_SYSTEM = buildStaticSystem();

function buildStaticSystem(): string {
  const map: string[] = [];
  for (const phase of methodology.phases) {
    for (const pillar of phase.pillars) {
      map.push(`${phase.name} › ${pillar.name}:`);
      for (const s of pillar.sections) {
        map.push(`- ${s.id} — ${s.name}${s.helpText ? `: ${s.helpText}` : ""}`);
      }
    }
  }
  return [
    "You are an expert brand strategist applying the Finisterra brand methodology.",
    "A business owner — not a designer — gives you rough notes about their own brand. Turn their notes into clear, specific, well-articulated content for ONE section of their brand strategy.",
    "Rules: Stay truthful to what they actually said — sharpen, structure, and articulate it. You may infer reasonable detail, but never invent facts that contradict their notes or the context. Write in clear, plain English the owner would recognize as their own. Be concrete and concise; avoid buzzwords and filler.",
    "Respond with ONLY a single JSON object — no prose, no markdown code fences. Its keys are exactly the field ids given in the task; its values match each field's stated type.",
    `THE METHODOLOGY, FOR CONTEXT (you are always writing exactly one section of it):\n${map.join("\n")}`,
  ].join("\n\n");
}

// Turn the owner's rough notes for one section into clear, well-articulated
// brand-strategy content, grounded in the methodology + any upstream steps.
export async function generateSection(
  projectId: string,
  sectionKey: string,
  rough: Record<string, unknown>
): Promise<GenerateResult> {
  const section = getSection(sectionKey);
  if (!section) throw new Error(`Unknown section: ${sectionKey}`);

  const project = getProject(projectId);
  const guide = sectionGuide(sectionKey);
  const reads = readsOf(sectionKey);

  // Pull the saved content of every upstream step this section builds on,
  // tracking which ones actually had content — that list is the provenance.
  const usedReads: string[] = [];
  const upstreamParts = reads
    .map((r) => {
      const row = getSectionRow(projectId, r.id);
      if (!row?.value || Object.keys(row.value).length === 0) return null;
      usedReads.push(r.id);
      return `### ${r.name}\n${JSON.stringify(row.value, null, 2)}`;
    })
    .filter((x): x is string => Boolean(x));

  // Own-words inputs (Reality/Identity facts) declare no reads — their context
  // is the owner's words everywhere else in those pillars (Quick Start drafts
  // included). The strictness line keeps the model from filling factual gaps.
  let strictness = "";
  if (section.kind === "input") {
    if (isOwnWordsInput(sectionKey)) {
      for (const row of getSections(projectId)) {
        const k = row.section_key;
        if (k === sectionKey || usedReads.includes(k)) continue;
        if (!k.startsWith("reality.") && !k.startsWith("identity.")) continue;
        if (!row.value || Object.keys(row.value).length === 0) continue;
        usedReads.push(k);
        upstreamParts.push(`### ${getSection(k)?.name ?? k}\n${JSON.stringify(row.value, null, 2)}`);
      }
      strictness =
        "THIS STEP RECORDS THE OWNER'S OWN FACTS. Structure and articulate only what their notes and the context above actually support. Where a specific fact (numbers, capacity, prices, channel names) is stated nowhere, return an empty string for that field rather than inventing it.";
    } else if (PROPOSABLE_INPUTS.has(sectionKey)) {
      for (const k of ["concept", "brief.central-pattern", "reality.differentiator", "communication.personality"]) {
        if (usedReads.includes(k)) continue;
        const row = getSectionRow(projectId, k);
        if (!row?.value || Object.keys(row.value).length === 0) continue;
        usedReads.push(k);
        upstreamParts.push(`### ${getSection(k)?.name ?? k}\n${JSON.stringify(row.value, null, 2)}`);
      }
      strictness =
        "This step is ultimately the owner's call — propose a strong starting point derived from the strategy; they will review and edit it.";
    }
  }
  const upstream = upstreamParts.join("\n\n");

  const fields = section.fields ?? [];
  const fieldSpec = fields
    .map((f) => {
      let t: string = f.type;
      if (f.type === "enum" && f.options) t += ` — return exactly one of: ${f.options.join(" | ")}`;
      if (f.type === "list") t += " — return an array of short strings";
      if (f.type === "table" && f.columns)
        t += ` — return an array of row objects, each with keys: ${f.columns.map((c) => c.id).join(", ")}`;
      if (f.type === "text" || f.type === "textarea") t += " — return a string";
      return `- "${f.id}" (${f.label}) [${t}]`;
    })
    .join("\n");

  const specialist = getSectionPrompt(sectionKey);

  const parts: string[] = [];
  if (project)
    parts.push(`BRAND: ${project.name}${project.client_name ? ` (client: ${project.client_name})` : ""}`);
  parts.push(`SECTION: ${section.name}`);
  if (guide.whatItIs) parts.push(`WHAT THIS SECTION IS: ${guide.whatItIs}`);
  if (guide.whyItMatters) parts.push(`WHY IT MATTERS: ${guide.whyItMatters}`);
  if (specialist?.systemAddon) parts.push(`SECTION QUALITY BAR:\n${specialist.systemAddon}`);
  if (section.triggerQuestions?.length)
    parts.push(`IT SHOULD ANSWER:\n${section.triggerQuestions.map((q) => `- ${q}`).join("\n")}`);
  if (upstream) parts.push(`CONTEXT FROM EARLIER STEPS (build on this, stay consistent):\n${upstream}`);
  if (strictness) parts.push(strictness);
  parts.push(`FIELDS TO FILL (your JSON keys are these ids):\n${fieldSpec || "(none)"}`);
  parts.push(
    `THE OWNER'S ROUGH NOTES (improve these into finished content; if a field is empty, draft it from the context above):\n${JSON.stringify(rough ?? {}, null, 2)}`
  );
  parts.push("Return the JSON object now.");

  // Mechanical derivation (e.g. survey questions) uses Haiku; flagship synthesis uses the default (Opus).
  const model = specialist?.useParsingModel ? MODELS.parsing : getDefaultModel();
  const { text, model: usedModel } = await generateText({
    model,
    maxTokens: 8192,
    system: STATIC_SYSTEM,
    messages: [{ role: "user", content: parts.join("\n\n") }],
    cacheSystem: true,
  });

  // Keep only the section's own fields, and only non-empty values — the model's
  // stray keys or empty strings must not overwrite anything downstream.
  const raw = extractJson(text);
  const knownIds = new Set(fields.map((f) => f.id));
  const values = Object.fromEntries(
    Object.entries(raw).filter(([k, v]) => knownIds.has(k) && isNonEmpty(v))
  );
  if (Object.keys(values).length === 0) {
    throw new Error("The AI didn't return usable content for this section. Try again, or add a few notes first.");
  }

  return { values, reads: usedReads, model: usedModel };
}

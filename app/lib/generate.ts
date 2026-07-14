import "server-only";
import { getClient, MODELS } from "@/lib/anthropic";
import { methodology, getSection, getPillarOf, readsOf, canGenerate } from "@/lib/methodology";
import { sectionGuide } from "@/lib/guide";
import { getProject, getSectionRow, filledKeys } from "@/lib/queries";
import { getDefaultModel } from "@/lib/settings";
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

// Server-side generation gate — the client UI mirrors this, but the API is the
// authority. Returns a user-facing reason when generation must not run:
//  - input/eval steps capture real-world facts; the AI must never invent them
//    (especially image.results — fabricated survey answers poison the Image pillar);
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
  if (section.kind !== "synthesis" && section.kind !== "partial") {
    return "This step records real answers — yours or your customers' — so the AI can't write it for you.";
  }
  const filled = filledKeys(projectId);
  if (canGenerate(sectionKey, filled)) return null;
  if (Object.values(rough ?? {}).some(isNonEmpty)) return null;
  const pillar = getPillarOf(sectionKey);
  if ((pillar?.id === "reality" || pillar?.id === "identity") && (section.reads ?? []).some((r) => filled.has(r)))
    return null;
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
  const upstream = reads
    .map((r) => {
      const row = getSectionRow(projectId, r.id);
      if (!row?.value || Object.keys(row.value).length === 0) return null;
      usedReads.push(r.id);
      return `### ${r.name}\n${JSON.stringify(row.value, null, 2)}`;
    })
    .filter(Boolean)
    .join("\n\n");

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
  parts.push(`FIELDS TO FILL (your JSON keys are these ids):\n${fieldSpec || "(none)"}`);
  parts.push(
    `THE OWNER'S ROUGH NOTES (improve these into finished content; if a field is empty, draft it from the context above):\n${JSON.stringify(rough ?? {}, null, 2)}`
  );
  parts.push("Return the JSON object now.");

  // Mechanical derivation (e.g. survey questions) uses Haiku; flagship synthesis uses the default (Opus).
  const model = specialist?.useParsingModel ? MODELS.parsing : getDefaultModel();
  const resp = await getClient().messages.create({
    model,
    max_tokens: 8192,
    system: [{ type: "text", text: STATIC_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: parts.join("\n\n") }],
  });

  const text = resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

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

  return { values, reads: usedReads, model };
}

import "server-only";
import { generateText, MODELS } from "@/lib/ai";
import { extractJson } from "@/lib/json";
import { getSection, type Section } from "@/lib/methodology";
import { getSectionRow, saveSection } from "@/lib/queries";
import type { SectionValue } from "@/lib/db/types";
import { db } from "@/lib/db";
import { ai_generations } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import {
  intakeAnswersToSectionValue,
  normalizeIntakeAnswers,
  parseIntakeAnswersSection,
  type IntakeAnswers,
} from "@/lib/intake-answers";

export type { IntakeAnswers } from "@/lib/intake-answers";
export {
  normalizeIntakeAnswers,
  parseIntakeAnswersSection,
  countFilledIntakeAnswers,
  intakeAnswersToSectionValue,
} from "@/lib/intake-answers";

/**
 * Persist the owner's six Quick Start answers before any AI work.
 * Also mirrors taste to `intake.taste` for Design Studio / brand memory.
 */
export function saveIntakeAnswers(projectId: string, answers: IntakeAnswers): void {
  const normalized = normalizeIntakeAnswers(answers);
  saveSection({
    projectId,
    key: "intake.answers",
    value: intakeAnswersToSectionValue(normalized) as unknown as SectionValue,
    status: "complete",
    aiGenerated: false,
  });
  // Keep the dedicated taste key for callers that already read it.
  if (normalized.taste) {
    saveSection({
      projectId,
      key: "intake.taste",
      value: { taste: normalized.taste },
      status: "complete",
      aiGenerated: false,
    });
  }
}

export function readIntakeAnswers(projectId: string): IntakeAnswers | null {
  const row = getSectionRow(projectId, "intake.answers");
  const fromBundle = parseIntakeAnswersSection(
    row?.value as Record<string, unknown> | undefined
  );
  if (fromBundle) return fromBundle;
  // Legacy: only taste was stored.
  const tasteRow = getSectionRow(projectId, "intake.taste");
  const taste = (tasteRow?.value as { taste?: string } | undefined)?.taste?.trim() ?? "";
  if (!taste) return null;
  return normalizeIntakeAnswers({ taste });
}

export type ExpandResult = {
  filled: string[]; // section ids that received a draft
  model: string;
};

// Reality + Identity input sections the interview fills.
// Optional owner details (packages, channels) are NOT forced here — they no
// longer block Strategy completion (see methodology optional: true).
const TARGETS = [
  "reality.problem",
  "reality.solution",
  "reality.service",
  "reality.ideal-client",
  "reality.business-stage",
  "reality.capacity",
  "reality.operational-quirks",
  "identity.origin",
  "identity.self-perception",
  "identity.aspiration",
  "identity.beliefs",
];

// Render one section's fields as a contract the model fills.
function fieldSpec(section: Section): string {
  return (section.fields ?? [])
    .map((f) => {
      let t: string = f.type;
      if (f.type === "enum" && f.options) t += ` — exactly one of: ${f.options.join(" | ")}`;
      else if (f.type === "list") t += " — an array of short strings";
      else if (f.type === "table" && f.columns)
        t += ` — an array of row objects, each with keys: ${f.columns.map((c) => c.id).join(", ")}`;
      else t += " — a string";
      return `    - "${f.id}" (${f.label}) [${t}]`;
    })
    .join("\n");
}

// Describe one target section to the model: what it is, what it should answer,
// and the exact JSON shape its value must take.
function sectionBrief(section: Section): string {
  const parts = [`### ${section.id} — ${section.name}`];
  if (section.helpText) parts.push(section.helpText);
  if (section.triggerQuestions?.length)
    parts.push(`It should answer:\n${section.triggerQuestions.map((q) => `  - ${q}`).join("\n")}`);
  parts.push(`Fields (your JSON value for "${section.id}" has exactly these keys):\n${fieldSpec(section)}`);
  return parts.join("\n");
}

const SYSTEM_INTRO = [
  "You are an expert brand strategist applying the Finisterra brand methodology.",
  "A business owner — not a designer — has answered a few broad questions about their own brand. Your job is to expand those answers into clear, specific, well-articulated FIRST DRAFTS for several sections of their brand strategy, which they will then review and edit.",
  "",
  "Rules:",
  "- Stay truthful to what they actually said. Sharpen, structure, and articulate it; you may infer reasonable detail, but never invent facts that contradict their answers.",
  "- Write in plain English the owner would recognize as their own voice. Be concrete and concise; avoid buzzwords and filler.",
  "- If you genuinely cannot fill a field from the answers, use an empty string (or empty array) rather than inventing something — they will fill it in.",
  "",
  "Respond with ONLY a single JSON object — no prose, no markdown fences. Its top-level keys are the section ids listed below; each value is an object whose keys are that section's field ids, matching the stated types.",
].join("\n");

// Build the cacheable system prompt: a stable description of every section this
// interview can fill. Identical across projects ⇒ prompt-cacheable.
function buildSystem(): string {
  const briefs = TARGETS
    .map((id) => getSection(id))
    .filter((s): s is Section => Boolean(s))
    .map(sectionBrief)
    .join("\n\n");
  return `${SYSTEM_INTRO}\n\nSECTIONS TO FILL:\n\n${briefs}`;
}

function buildUserMessage(brandName: string, a: IntakeAnswers, memory = ""): string {
  const lines = [
    `BRAND: ${brandName}`,
    "",
    "The owner's answers:",
    `1. What they sell and to whom:\n${a.offering || "(not answered)"}`,
    `2. How it started and where it's going:\n${a.story || "(not answered)"}`,
    `3. What makes them different, and what they believe about their industry:\n${a.difference || "(not answered)"}`,
    `4. How the business runs today (stage, pricing/packages, how clients find them, capacity/limits):\n${a.operations || "(not answered)"}`,
    `5. One thing that's true about them a competitor couldn't say:\n${a.edge || "(not answered)"}`,
    `6. How they want the brand to look and feel (styles admired, feelings wanted, things to avoid):\n${a.taste || "(not answered)"}`,
  ];
  if (memory) lines.push("", memory);
  lines.push("\nReturn the JSON object now.");
  return lines.join("\n");
}

function objectHasContent(obj: Record<string, unknown>): boolean {
  return Object.values(obj).some((v) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

function saveIntakeDraft(
  projectId: string,
  id: string,
  obj: Record<string, unknown>,
  model: string
): void {
  saveSection({
    projectId,
    key: id,
    value: obj as unknown as SectionValue,
    status: "draft",
    aiGenerated: true,
  });
  db.insert(ai_generations)
    .values({
      id: nanoid(),
      project_id: projectId,
      section_key: id,
      model,
      reads: ["quick-start-intake"],
      output: JSON.stringify(obj).slice(0, 20000),
      accepted: true,
    })
    .run();
}

/** Deterministic drafts when the model leaves a Reality/Identity section empty. */
function fallbackFromAnswers(
  sectionId: string,
  brandName: string,
  a: IntakeAnswers
): Record<string, unknown> | null {
  const section = getSection(sectionId);
  if (!section?.fields?.length) return null;

  const blob = [a.offering, a.story, a.difference, a.operations, a.edge, a.taste]
    .filter(Boolean)
    .join(" ");

  // Section-aware seed text so empty fields still carry the owner's meaning.
  const seeds: Record<string, string> = {
    "reality.problem": a.offering || blob,
    "reality.solution": a.offering || a.difference || blob,
    "reality.service": a.offering || blob,
    "reality.ideal-client": a.offering || blob,
    "reality.business-stage": a.operations || a.story || blob,
    "reality.capacity": a.operations || blob,
    "reality.operational-quirks": a.edge || a.operations || blob,
    "identity.origin": a.story || blob,
    "identity.self-perception": a.difference || a.edge || blob,
    "identity.aspiration": a.story || a.difference || blob,
    "identity.beliefs": a.difference || a.edge || blob,
  };
  const seed = (seeds[sectionId] || blob || brandName).trim();
  if (!seed) return null;

  const out: Record<string, unknown> = {};
  for (const f of section.fields) {
    if (f.type === "list") {
      out[f.id] = seed
        .split(/[.;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);
      if ((out[f.id] as string[]).length === 0) out[f.id] = [seed.slice(0, 120)];
    } else if (f.type === "table" && f.columns?.length) {
      const row: Record<string, string> = {};
      for (const col of f.columns) {
        row[col.id] = seed.slice(0, 100);
      }
      out[f.id] = [row];
    } else if (f.type === "enum" && f.options?.length) {
      // Prefer a middle/default option rather than inventing outside the set.
      const lower = seed.toLowerCase();
      out[f.id] =
        f.options.find((o) => lower.includes(o.toLowerCase())) ?? f.options[0];
    } else {
      out[f.id] = seed.length > 800 ? seed.slice(0, 800) + "…" : seed;
    }
  }
  return objectHasContent(out) ? out : null;
}

// Run the Quick Start expansion: one Opus call turns the owner's answers into
// drafts for every target section, saved as editable AI drafts (status "draft",
// ai_generated true) for the owner to review.
//
// Contract: EVERY target Reality/Identity section is filled. If the model skips
// one, we retry once for the gaps, then fall back to structured text from the
// six answers — never leave required Reality steps empty after Quick Start.
export async function expandIntake(projectId: string, brandName: string, answers: IntakeAnswers): Promise<ExpandResult> {
  const system = buildSystem();
  let memory = "";
  try {
    const { formatMemoryForPrompt } = await import("@/lib/brand-memory");
    memory = formatMemoryForPrompt("strategy", { excludeProjectId: projectId, limit: 5 });
  } catch {
    /* optional until migration */
  }
  const user = buildUserMessage(brandName, answers, memory);

  const { text, model } = await generateText({
    model: MODELS.reasoning,
    maxTokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
    cacheSystem: true,
  });
  let parsed = extractJson(text) as Record<string, unknown>;

  const filled: string[] = [];
  const missing: string[] = [];

  for (const id of TARGETS) {
    const value = parsed[id];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      missing.push(id);
      continue;
    }
    const obj = value as Record<string, unknown>;
    if (!objectHasContent(obj)) {
      missing.push(id);
      continue;
    }
    saveIntakeDraft(projectId, id, obj, model);
    filled.push(id);
  }

  // Second AI pass: only the gaps, with a stricter instruction.
  if (missing.length > 0) {
    try {
      const gapBriefs = missing
        .map((id) => getSection(id))
        .filter((s): s is Section => Boolean(s))
        .map(sectionBrief)
        .join("\n\n");
      const { text: gapText, model: gapModel } = await generateText({
        model: MODELS.reasoning,
        maxTokens: 8000,
        system: `${SYSTEM_INTRO}\n\nYou MUST fill EVERY section below. Do not leave strings empty. Infer reasonably from the owner's answers.\n\nSECTIONS TO FILL:\n\n${gapBriefs}`,
        messages: [{ role: "user", content: buildUserMessage(brandName, answers) }],
      });
      parsed = extractJson(gapText) as Record<string, unknown>;
      const stillMissing: string[] = [];
      for (const id of missing) {
        const value = parsed[id];
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          stillMissing.push(id);
          continue;
        }
        const obj = value as Record<string, unknown>;
        if (!objectHasContent(obj)) {
          stillMissing.push(id);
          continue;
        }
        saveIntakeDraft(projectId, id, obj, gapModel);
        filled.push(id);
      }
      missing.length = 0;
      missing.push(...stillMissing);
    } catch (e) {
      console.warn("[intake] gap fill failed, using answer fallbacks:", e);
    }
  }

  // Last resort: never leave a Reality/Identity target blank after Quick Start.
  for (const id of missing) {
    const fallback = fallbackFromAnswers(id, brandName, answers);
    if (!fallback) {
      console.warn(`[intake] could not fallback-fill ${id}`);
      continue;
    }
    saveIntakeDraft(projectId, id, fallback, `${model}+fallback`);
    filled.push(id);
  }

  return { filled, model };
}

/** All Reality + Identity section ids the Quick Start is responsible for. */
export function intakeTargetSectionIds(): string[] {
  return [...TARGETS];
}

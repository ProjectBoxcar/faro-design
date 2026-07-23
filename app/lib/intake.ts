import "server-only";
import { generateText, MODELS } from "@/lib/ai";
import { extractJson } from "@/lib/json";
import { getSection, type Section } from "@/lib/methodology";
import { saveSection } from "@/lib/queries";
import type { SectionValue } from "@/lib/db/types";
import { db } from "@/lib/db";
import { ai_generations } from "@/lib/db/schema";
import { nanoid } from "nanoid";

// The Quick Start interview: five broad questions the brand owner answers up
// front. The AI expands these into editable drafts for every owner-knowable
// input section of Reality + Identity, so the owner reviews and refines
// instead of starting blank.
export type IntakeAnswers = {
  offering: string; // Q1 — what they sell and to whom
  story: string; // Q2 — how it started and where it's going
  difference: string; // Q3 — what makes them different + industry beliefs
  operations: string; // Q4 — stage, pricing, how clients find them, limits
  edge: string; // Q5 — the one thing a competitor couldn't say
  taste: string; // Q6 — how the brand should look and feel (design taste)
};

export type ExpandResult = {
  filled: string[]; // section ids that received a draft
  model: string;
};

// Reality + Identity input sections the interview fills.
const TARGETS = [
  "reality.problem",
  "reality.solution",
  "reality.service",
  "reality.ideal-client",
  "reality.business-stage",
  "reality.service-structure",
  "reality.acquisition-channels",
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

function buildUserMessage(brandName: string, a: IntakeAnswers): string {
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
  lines.push("\nReturn the JSON object now.");
  return lines.join("\n");
}

// Run the Quick Start expansion: one Opus call turns the owner's answers into
// drafts for every target section, saved as editable AI drafts (status "draft",
// ai_generated true) for the owner to review.
export async function expandIntake(projectId: string, brandName: string, answers: IntakeAnswers): Promise<ExpandResult> {
  const system = buildSystem();
  const user = buildUserMessage(brandName, answers);

  const { text, model } = await generateText({
    model: MODELS.reasoning,
    maxTokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
    cacheSystem: true,
  });
  const parsed = extractJson(text);

  const filled: string[] = [];

  for (const id of TARGETS) {
    const value = parsed[id];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const obj = value as Record<string, unknown>;
    // Skip sections the model left entirely empty.
    const hasContent = Object.values(obj).some((v) => {
      if (v == null) return false;
      if (typeof v === "string") return v.trim() !== "";
      if (Array.isArray(v)) return v.length > 0;
      return true;
    });
    if (!hasContent) continue;

    saveSection({ projectId, key: id, value: obj as unknown as SectionValue, status: "draft", aiGenerated: true });
    db.insert(ai_generations)
      .values({
        id: nanoid(),
        project_id: projectId,
        section_key: id,
        model,
        reads: ["quick-start-intake"],
        output: JSON.stringify(obj),
        accepted: true,
      })
      .run();
    filled.push(id);
  }

  return { filled, model };
}

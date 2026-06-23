import "server-only";
import { getClient, MODELS } from "@/lib/anthropic";
import { getSection, readsOf } from "@/lib/methodology";
import { sectionGuide } from "@/lib/guide";
import { getProject, getSectionRow } from "@/lib/queries";

export type GenerateResult = {
  values: Record<string, unknown>;
  reads: string[];
  model: string;
};

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

  // Pull the saved content of every upstream step this section builds on.
  const upstream = reads
    .map((r) => {
      const row = getSectionRow(projectId, r.id);
      if (!row?.value || Object.keys(row.value).length === 0) return null;
      return `### ${r.name}\n${JSON.stringify(row.value, null, 2)}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const fieldSpec = (section.fields ?? [])
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

  const system = [
    "You are an expert brand strategist applying the Finisterra brand methodology.",
    "A business owner — not a designer — gives you rough notes about their own brand. Turn their notes into clear, specific, well-articulated content for ONE section of their brand strategy.",
    "Rules: Stay truthful to what they actually said — sharpen, structure, and articulate it. You may infer reasonable detail, but never invent facts that contradict their notes or the context. Write in clear, plain English the owner would recognize as their own. Be concrete and concise; avoid buzzwords and filler.",
    "Respond with ONLY a single JSON object — no prose, no markdown code fences. Its keys are exactly the field ids given in the task; its values match each field's stated type.",
  ].join("\n\n");

  const parts: string[] = [];
  if (project)
    parts.push(`BRAND: ${project.name}${project.client_name ? ` (client: ${project.client_name})` : ""}`);
  parts.push(`SECTION: ${section.name}`);
  if (guide.whatItIs) parts.push(`WHAT THIS SECTION IS: ${guide.whatItIs}`);
  if (guide.whyItMatters) parts.push(`WHY IT MATTERS: ${guide.whyItMatters}`);
  if (section.triggerQuestions?.length)
    parts.push(`IT SHOULD ANSWER:\n${section.triggerQuestions.map((q) => `- ${q}`).join("\n")}`);
  if (upstream) parts.push(`CONTEXT FROM EARLIER STEPS (build on this, stay consistent):\n${upstream}`);
  parts.push(`FIELDS TO FILL (your JSON keys are these ids):\n${fieldSpec || "(none)"}`);
  parts.push(
    `THE OWNER'S ROUGH NOTES (improve these into finished content; if a field is empty, draft it from the context above):\n${JSON.stringify(rough ?? {}, null, 2)}`
  );
  parts.push("Return the JSON object now.");

  const resp = await getClient().messages.create({
    model: MODELS.reasoning,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: parts.join("\n\n") }],
  });

  const text = resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  return { values: extractJson(text), reads: reads.map((r) => r.id), model: MODELS.reasoning };
}

// Tolerant extraction: pull the first {...} object out of the model's reply.
function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    return obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

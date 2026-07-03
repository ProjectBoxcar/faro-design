import "server-only";
import { getClient, MODELS } from "@/lib/anthropic";
import { getSection } from "@/lib/methodology";
import { extractJson } from "@/lib/json";
import {
  getProject,
  getSections,
  getSectionRow,
  saveSection,
  insertEvaluation,
  setProjectViability,
} from "@/lib/queries";
import { db } from "@/lib/db";
import { ai_generations } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import type { EvalScore } from "@/lib/db/types";

const GATE_KEY = "reality.evaluation-criteria";

// Criteria where a "no" means the methodology says do not proceed (recurring
// sales, budget). Matched against the seeded criterion text.
const BLOCKING = [/recurring sales/i, /budget/i];

// Run the internal viability gate once its upstream Reality steps are complete.
// The methodology decides — the owner is never asked to adjudicate. Fire-and-forget
// from the sections/review routes; failures just leave viability "pending" for the
// next completion to retry.
export async function maybeRunViabilityGate(projectId: string): Promise<void> {
  const project = getProject(projectId);
  if (!project || project.viability !== "pending") return;

  const gate = getSection(GATE_KEY);
  if (!gate) return;

  // Filled (draft or complete) is enough: the inputs are the owner's real
  // answers, and some (business stage, capacity) live outside the four review
  // screens, so waiting for "complete" could postpone the gate forever.
  const rows = getSections(projectId);
  const statusOf = new Map(rows.map((r) => [r.section_key, r.status]));
  const ready = (gate.reads ?? []).every((r) => (statusOf.get(r) ?? "empty") !== "empty");
  if (!ready) return;

  await runViabilityGate(projectId);
}

async function runViabilityGate(projectId: string): Promise<void> {
  const project = getProject(projectId);
  const gate = getSection(GATE_KEY);
  if (!project || !gate) return;

  const criteria = gate.fields?.find((f) => f.id === "criteria")?.items ?? [];
  if (criteria.length === 0) return;

  const upstream = (gate.reads ?? [])
    .map((key) => {
      const row = getSectionRow(projectId, key);
      if (!row?.value) return null;
      const section = getSection(key);
      return `### ${section?.name ?? key}\n${JSON.stringify(row.value, null, 2)}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const criteriaList = criteria
    .map((c, i) => `${i + 1}. [${c.type}] ${c.criterion} — implication: ${c.implication ?? ""}`)
    .join("\n");

  const prompt = [
    `You are applying the Finisterra methodology's internal viability gate to the brand project "${project.name}".`,
    `Answer each criterion strictly yes or no based ONLY on the owner's answers below. If the answers don't address a criterion, infer conservatively and say so in the note.`,
    `CRITERIA:\n${criteriaList}`,
    `THE OWNER'S ANSWERS:\n${upstream || "(nothing on file)"}`,
    `Respond with ONLY a JSON object: {"answers": [{"n": <criterion number>, "answer": "yes"|"no", "note": "<one sentence of evidence>"}]} — one entry per criterion, in order.`,
  ].join("\n\n");

  const resp = await getClient().messages.create({
    model: MODELS.reasoning,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const parsed = extractJson(text);
  const answers = Array.isArray(parsed.answers) ? (parsed.answers as { n?: number; answer?: string; note?: string }[]) : [];
  if (answers.length !== criteria.length) throw new Error("Viability gate: malformed evaluation");

  const scored = criteria.map((c, i) => {
    const a = answers.find((x) => x.n === i + 1) ?? answers[i];
    return {
      criterion: c.criterion,
      type: c.type,
      answer: a?.answer === "no" ? "no" : "yes",
      note: a?.note ?? "",
      implication: c.implication ?? "",
    };
  });

  // The verdict is deterministic, per the methodology's own rules: a "no" on a
  // blocking non-negotiable fails the gate; a "no" on other non-negotiables or a
  // bad sign on a warning is a caveat; otherwise pass. ("yes" is the bad answer
  // for warning criteria, which are phrased as risk signals.)
  const failed = scored.some(
    (s) => s.type === "non-negotiable" && s.answer === "no" && BLOCKING.some((rx) => rx.test(s.criterion))
  );
  const caveats = scored.some(
    (s) =>
      (s.type === "non-negotiable" && s.answer === "no") ||
      (s.type === "warning" && /risk|do not proceed/i.test(s.implication) && s.answer === "yes")
  );
  const verdict = failed ? "fail" : caveats ? "caveat" : "pass";

  const scores: EvalScore[] = scored.map((s, i) => ({
    key: `criterion-${i + 1}`,
    label: s.criterion,
    level: s.type as EvalScore["level"],
    result: s.answer,
    notes: s.note,
  }));

  insertEvaluation({ projectId, type: "viability", subject: project.name, scores, verdict });

  // Fill the internal section so the full scored table is readable in-app.
  saveSection({
    projectId,
    key: GATE_KEY,
    value: {
      criteria: scored.map((s) => ({
        criterion: s.criterion,
        type: s.type,
        answer: s.answer,
        implication: s.note || s.implication,
      })),
    },
    status: "complete",
    aiGenerated: true,
  });

  db.insert(ai_generations)
    .values({
      id: nanoid(),
      project_id: projectId,
      section_key: GATE_KEY,
      model: MODELS.reasoning,
      reads: gate.reads ?? [],
      output: JSON.stringify(scored),
      accepted: true,
    })
    .run();

  setProjectViability(projectId, verdict === "fail" ? "fail" : "pass");
  console.log(`[viability] ${project.name}: ${verdict}`);
}

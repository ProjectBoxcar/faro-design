import "server-only";
import { generateText, MODELS } from "@/lib/ai";
import { getSection } from "@/lib/methodology";
import { extractJson } from "@/lib/json";
import {
  getProject,
  getSections,
  getSectionRow,
  saveSection,
  insertEvaluation,
  setProjectViability,
  clearViabilityOverride,
} from "@/lib/queries";
import { db } from "@/lib/db";
import { ai_generations } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import type { EvalScore } from "@/lib/db/types";
import {
  GATE_KEY,
  scoreViabilityVerdict,
  type CriterionScore,
  type ViabilityVerdict,
} from "@/lib/viability-score";

export { GATE_KEY, scoreViabilityVerdict };
export type { CriterionScore, ViabilityVerdict };

const inFlightChecks = new Map<string, Promise<void>>();

function isTransientProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /overloaded|api_error|internal server error|rate.?limit|timeout|529|503/i.test(message);
}

async function runViabilityWithRetry(projectId: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await runViabilityGate(projectId);
      return;
    } catch (error) {
      lastError = error;
      if (!isTransientProviderError(error) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  throw lastError;
}

// Run the internal viability gate once its upstream Reality steps are complete.
// The methodology decides — the owner is never asked to adjudicate. Fire-and-forget
// from the sections/review routes; failures leave viability "pending" for retry.
//
// force=true re-runs after Reality inputs change (or from the hub "Re-check" action).
export async function maybeRunViabilityGate(
  projectId: string,
  opts: { force?: boolean } = {}
): Promise<void> {
  const project = getProject(projectId);
  if (!project) return;
  if (!opts.force && project.viability !== "pending") return;

  const gate = getSection(GATE_KEY);
  if (!gate) return;

  // Filled (draft or complete) is enough: the inputs are the owner's real
  // answers, and some (business stage, capacity) live outside the four review
  // screens, so waiting for "complete" could postpone the gate forever.
  // An input the owner had nothing to say for stays empty forever, so it
  // can't hold the gate hostage — require the rest, and at least one filled.
  const rows = getSections(projectId);
  const statusOf = new Map(rows.map((r) => [r.section_key, r.status]));
  const reads = gate.reads ?? [];
  const filled = reads.filter((r) => (statusOf.get(r) ?? "empty") !== "empty");
  const ready =
    filled.length > 0 &&
    reads.every((r) => filled.includes(r) || getSection(r)?.kind === "input");
  if (!ready) return;

  const existing = inFlightChecks.get(projectId);
  if (existing) return existing;
  const run = runViabilityWithRetry(projectId).finally(() => inFlightChecks.delete(projectId));
  inFlightChecks.set(projectId, run);
  return run;
}

// True when this section key is an upstream input of the viability gate.
export function isViabilityInput(sectionKey: string): boolean {
  const gate = getSection(GATE_KEY);
  return (gate?.reads ?? []).includes(sectionKey);
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

  // Without a separate client on file, the founder answering IS the client:
  // they approve creative direction and fund the work by definition, so the
  // agency-screening criteria about decision-makers and budget are met.
  const ownerLed = !project.client_name;
  const greenfield = Boolean(project.greenfield);
  const prompt = [
    `You are applying the Finisterra methodology's internal viability gate to the brand project "${project.name}".`,
    `Answer each criterion strictly yes or no based ONLY on the owner's answers below. If the answers don't address a criterion, infer conservatively and say so in the note.`,
    ...(ownerLed
      ? [
          `NOTE: This project is OWNER-LED — the founder is building their own brand directly in this tool. The person answering IS the decision-maker who approves creative direction, and by running the project themselves they have committed its budget. Answer those criteria "yes" unless the answers state otherwise.`,
        ]
      : [
          `NOTE: If budget or a named decision-maker is not mentioned in the answers, answer "yes" with a short note that it was not stated — do NOT invent a hard "no". Only answer "no" when the answers clearly show there is no budget or no one who can approve. Rebrands of operating businesses often omit these details.`,
        ]),
    ...(greenfield
      ? [
          `NOTE: This is a GREENFIELD brand — not yet launched or still pre-revenue. "Recurring sales exist" should be "no" with a note that the brand is greenfield (that is expected, not a red flag). Do not invent existing revenue.`,
        ]
      : []),
    `CRITERIA:\n${criteriaList}`,
    `THE OWNER'S ANSWERS:\n${upstream || "(nothing on file)"}`,
    `Respond with ONLY a JSON object: {"answers": [{"n": <criterion number>, "answer": "yes"|"no", "note": "<one sentence of evidence>"}]} — one entry per criterion, in order.`,
  ].join("\n\n");

  const { text } = await generateText({
    model: MODELS.reasoning,
    maxTokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  const parsed = extractJson(text);
  const answers = Array.isArray(parsed.answers)
    ? (parsed.answers as { n?: number; answer?: string; note?: string }[])
    : [];
  if (answers.length !== criteria.length) throw new Error("Viability gate: malformed evaluation");

  const scored: CriterionScore[] = criteria.map((c, i) => {
    const a = answers.find((x) => x.n === i + 1) ?? answers[i];
    return {
      criterion: String(c.criterion ?? ""),
      type: (c.type as CriterionScore["type"]) ?? "warning",
      answer: a?.answer === "no" ? "no" : "yes",
      note: a?.note ?? "",
      implication: String(c.implication ?? ""),
    };
  });

  const verdict = scoreViabilityVerdict(scored, {
    personal: Boolean(project.personal),
    greenfield: Boolean(project.greenfield),
  });

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
      criteria: scored.map((s) => {
        const softCommercial = project.personal || project.greenfield;
        const softBudgetOrDecision = /budget|decision-maker|approve creative/i.test(s.criterion);
        const waived =
          s.type === "non-negotiable" &&
          s.answer === "no" &&
          ((softCommercial && /recurring sales|budget/i.test(s.criterion)) || softBudgetOrDecision);
        const waiverLabel = softBudgetOrDecision
          ? "Does not block Logo Workshop / Design Studio — complete when known. "
          : project.personal
            ? "Not blocking — personal project. "
            : project.greenfield
              ? "Not blocking — greenfield brand (expected pre-revenue gap). "
              : "";
        return {
          criterion: s.criterion,
          type: s.type,
          answer: s.answer,
          implication: (waived ? waiverLabel : "") + (s.note || s.implication),
        };
      }),
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

  // Fresh run clears any previous soft-override.
  clearViabilityOverride(projectId);
  setProjectViability(projectId, verdict);
  console.log(`[viability] ${project.name}: ${verdict}`);
}

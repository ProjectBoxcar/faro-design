/**
 * Pure helpers for Quick Start intake answers (no DB).
 * Durable storage uses section key `intake.answers`.
 */

export type IntakeAnswers = {
  offering: string;
  story: string;
  difference: string;
  operations: string;
  edge: string;
  taste: string;
};

export const INTAKE_ANSWER_KEYS = [
  "offering",
  "story",
  "difference",
  "operations",
  "edge",
  "taste",
] as const satisfies readonly (keyof IntakeAnswers)[];

export type IntakeAnswersRecord = {
  offering: string;
  story: string;
  difference: string;
  operations: string;
  edge: string;
  taste: string;
  /** ISO timestamp when the owner submitted Quick Start. */
  savedAt?: string;
};

export function normalizeIntakeAnswers(
  raw: Partial<Record<keyof IntakeAnswers, string>> | null | undefined
): IntakeAnswers {
  return {
    offering: String(raw?.offering ?? "").trim(),
    story: String(raw?.story ?? "").trim(),
    difference: String(raw?.difference ?? "").trim(),
    operations: String(raw?.operations ?? "").trim(),
    edge: String(raw?.edge ?? "").trim(),
    taste: String(raw?.taste ?? "").trim(),
  };
}

export function intakeAnswersToSectionValue(
  answers: IntakeAnswers,
  savedAt = new Date().toISOString()
): IntakeAnswersRecord {
  const n = normalizeIntakeAnswers(answers);
  return { ...n, savedAt };
}

/** Count non-empty answer fields (0–6). */
export function countFilledIntakeAnswers(answers: IntakeAnswers): number {
  return INTAKE_ANSWER_KEYS.filter((k) => answers[k].trim().length > 0).length;
}

export function parseIntakeAnswersSection(
  value: Record<string, unknown> | null | undefined
): IntakeAnswers | null {
  if (!value || typeof value !== "object") return null;
  const n = normalizeIntakeAnswers(value as Partial<IntakeAnswers>);
  if (countFilledIntakeAnswers(n) === 0) return null;
  return n;
}

// Pure viability scoring — no DB, no AI. Used by the gate runner and unit tests.

export const GATE_KEY = "reality.evaluation-criteria";

// Criteria where a "no" means the methodology says do not proceed (recurring
// sales, budget). Matched against the seeded criterion text.
export const BLOCKING = [/recurring sales/i, /budget/i];

export type CriterionScore = {
  criterion: string;
  type: string; // non-negotiable | warning | positive
  answer: "yes" | "no";
  note?: string;
  implication?: string;
};

export type ViabilityVerdict = "pass" | "caveat" | "fail";

/**
 * Deterministic verdict from scored criteria.
 * - fail: non-negotiable blocking criterion is "no" (unless personal project)
 * - caveat: other non-negotiable "no", or warning risk signals "yes"
 * - pass: otherwise
 */
export function scoreViabilityVerdict(
  scored: CriterionScore[],
  personal: boolean
): ViabilityVerdict {
  const failed =
    !personal &&
    scored.some(
      (s) =>
        s.type === "non-negotiable" &&
        s.answer === "no" &&
        BLOCKING.some((rx) => rx.test(s.criterion))
    );
  if (failed) return "fail";

  const caveats = scored.some(
    (s) =>
      (s.type === "non-negotiable" && s.answer === "no") ||
      (s.type === "warning" &&
        /risk|do not proceed/i.test(s.implication ?? "") &&
        s.answer === "yes")
  );
  return caveats ? "caveat" : "pass";
}

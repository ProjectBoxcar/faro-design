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

export type ViabilityScoreOptions = {
  /** Founder building their own brand — commercial blockers become caveats. */
  personal?: boolean;
  /** Pre-revenue / not-yet-launched brand — same soft path (no hard-fail on sales/budget). */
  greenfield?: boolean;
};

/**
 * Deterministic verdict from scored criteria.
 * - fail: blocking commercial non-negotiable is "no" (client engagements only)
 * - caveat: other non-negotiable "no", soft commercial blockers, or risk warnings
 * - pass: otherwise
 *
 * Second arg may be `personal: boolean` (legacy) or `{ personal, greenfield }`.
 * Greenfield brands must not hard-fail solely because they lack recurring sales yet.
 */
export function scoreViabilityVerdict(
  scored: CriterionScore[],
  personalOrOpts: boolean | ViabilityScoreOptions = false
): ViabilityVerdict {
  const opts: ViabilityScoreOptions =
    typeof personalOrOpts === "boolean" ? { personal: personalOrOpts } : personalOrOpts;
  // Personal + greenfield: surface commercial gaps as caveats, never a hard stop.
  const softCommercial = Boolean(opts.personal || opts.greenfield);

  const hardFail =
    !softCommercial &&
    scored.some(
      (s) =>
        s.type === "non-negotiable" &&
        s.answer === "no" &&
        BLOCKING.some((rx) => rx.test(s.criterion))
    );
  if (hardFail) return "fail";

  const caveats = scored.some(
    (s) =>
      (s.type === "non-negotiable" && s.answer === "no") ||
      (s.type === "warning" &&
        /risk|do not proceed/i.test(s.implication ?? "") &&
        s.answer === "yes")
  );
  return caveats ? "caveat" : "pass";
}

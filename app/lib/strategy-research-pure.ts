/**
 * Pure gates for silent strategy grounding research.
 * Not a product feature — only decides when the pipeline may fetch external context.
 */

import type { IntakeAnswers } from "@/lib/intake-answers";
import { countFilledIntakeAnswers, INTAKE_ANSWER_KEYS } from "@/lib/intake-answers";

/** Internal section key — not in methodology UI / journey. */
export const STRATEGY_RESEARCH_SECTION_KEY = "internal.strategy-research";

export type ThinContextInput = {
  answers: IntakeAnswers;
  /** Greenfield brands usually need more external category grounding. */
  greenfield?: boolean;
};

export type ThinContextResult = {
  /** Whether silent research is allowed/needed. */
  needed: boolean;
  reasons: string[];
  totalChars: number;
  filledCount: number;
  shortFieldCount: number;
};

const MIN_TOTAL_CHARS = 420;
const MIN_FILLED_FOR_SKIP = 5;
const SHORT_FIELD_CHARS = 40;
/** If most non-empty fields are very short, still ground. */
const SHORT_FIELD_THRESHOLD = 3;

/** Strategy sections that benefit from category/competitor grounding. */
const RESEARCH_SENSITIVE_PREFIXES = [
  "reality.market",
  "reality.differentiator",
  "reality.value",
  "reality.problem",
  "reality.solution",
  "identity.position",
  "communication.",
  "brief.",
  "concept",
  "manifesto",
  "design-plan",
  "strategic-document",
] as const;

export function totalIntakeChars(answers: IntakeAnswers): number {
  return INTAKE_ANSWER_KEYS.reduce((n, k) => n + (answers[k]?.trim().length ?? 0), 0);
}

export function countShortIntakeFields(answers: IntakeAnswers, maxLen = SHORT_FIELD_CHARS): number {
  return INTAKE_ANSWER_KEYS.filter((k) => {
    const t = answers[k]?.trim() ?? "";
    return t.length > 0 && t.length < maxLen;
  }).length;
}

/**
 * Research only when owner context is thin — never when they already wrote a rich brief.
 */
export function shouldRunStrategyResearch(input: ThinContextInput): ThinContextResult {
  const filledCount = countFilledIntakeAnswers(input.answers);
  const totalChars = totalIntakeChars(input.answers);
  const shortFieldCount = countShortIntakeFields(input.answers);
  const reasons: string[] = [];

  if (filledCount === 0) {
    return { needed: false, reasons: ["no_answers"], totalChars, filledCount, shortFieldCount };
  }

  if (totalChars < MIN_TOTAL_CHARS) {
    reasons.push("low_total_chars");
  }
  if (filledCount < MIN_FILLED_FOR_SKIP) {
    reasons.push("few_fields_filled");
  }
  if (shortFieldCount >= SHORT_FIELD_THRESHOLD) {
    reasons.push("many_short_fields");
  }
  // Greenfield + any thin signal: extra weight on category grounding
  if (input.greenfield && (totalChars < MIN_TOTAL_CHARS * 1.4 || filledCount < 6)) {
    if (!reasons.includes("low_total_chars") && totalChars < MIN_TOTAL_CHARS * 1.4) {
      reasons.push("greenfield_sparse");
    }
  }

  // Difference / edge empty is a strong signal we need market orientation
  if (!input.answers.difference.trim() || !input.answers.edge.trim()) {
    reasons.push("missing_edge_or_difference");
  }

  // Only run if at least one thinness reason (not merely missing taste)
  const needed = reasons.some((r) =>
    [
      "low_total_chars",
      "few_fields_filled",
      "many_short_fields",
      "greenfield_sparse",
      "missing_edge_or_difference",
    ].includes(r)
  );

  // Rich enough answers: skip even if one field empty
  if (totalChars >= MIN_TOTAL_CHARS * 1.5 && filledCount >= MIN_FILLED_FOR_SKIP && shortFieldCount < 2) {
    // Only missing edge alone shouldn't trigger when the rest is rich
    if (reasons.length === 1 && reasons[0] === "missing_edge_or_difference") {
      return {
        needed: false,
        reasons: ["rich_context_skip"],
        totalChars,
        filledCount,
        shortFieldCount,
      };
    }
  }

  return { needed, reasons: needed ? reasons : ["sufficient_context"], totalChars, filledCount, shortFieldCount };
}

/** Whether a section draft should receive the silent research block. */
export function sectionUsesStrategyResearch(sectionKey: string): boolean {
  if (sectionKey.startsWith("identity.origin")) return false;
  if (sectionKey.startsWith("identity.self")) return false;
  if (sectionKey === "intake.answers" || sectionKey === "intake.taste") return false;
  if (sectionKey.startsWith("internal.")) return false;
  return RESEARCH_SENSITIVE_PREFIXES.some(
    (p) => sectionKey === p || sectionKey.startsWith(p)
  );
}

export type StrategyResearchPayload = {
  brief: string;
  reasons: string[];
  model?: string;
  createdAt?: string;
  /** Always false in product — research is internal only. */
  surfaceToOwner?: false;
};

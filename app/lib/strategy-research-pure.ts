/**
 * Pure gates and brief sanitization for silent strategy grounding research.
 * Not a product feature — only decides when the pipeline may fetch external context.
 */

import type { IntakeAnswers } from "@/lib/intake-answers";
import { countFilledIntakeAnswers, INTAKE_ANSWER_KEYS } from "@/lib/intake-answers";

/** Internal section key — not in methodology UI / journey. */
export const STRATEGY_RESEARCH_SECTION_KEY = "internal.strategy-research";

/** Hard cap for injected brief (keeps prompts lean). */
export const STRATEGY_RESEARCH_BRIEF_MAX_CHARS = 2000;

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

/** Core thinness signals — at least one of these must fire (edge-empty alone is not enough). */
const CORE_THIN_REASONS = [
  "low_total_chars",
  "few_fields_filled",
  "many_short_fields",
  "greenfield_sparse",
] as const;

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
 * Requires at least one *core* thin signal (short volume / few fields / greenfield-sparse).
 * Missing edge alone does not trigger a paid search.
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
  if (input.greenfield && (totalChars < MIN_TOTAL_CHARS * 1.4 || filledCount < 6)) {
    if (!reasons.includes("low_total_chars") && totalChars < MIN_TOTAL_CHARS * 1.4) {
      reasons.push("greenfield_sparse");
    }
  }
  if (!input.answers.difference.trim() || !input.answers.edge.trim()) {
    reasons.push("missing_edge_or_difference");
  }

  // Rich enough: never research
  if (
    totalChars >= MIN_TOTAL_CHARS * 1.5 &&
    filledCount >= MIN_FILLED_FOR_SKIP &&
    shortFieldCount < 2
  ) {
    return {
      needed: false,
      reasons: ["rich_context_skip"],
      totalChars,
      filledCount,
      shortFieldCount,
    };
  }

  const hasCoreThin = CORE_THIN_REASONS.some((r) => reasons.includes(r));
  const needed = hasCoreThin;

  return {
    needed,
    reasons: needed ? reasons : ["sufficient_context"],
    totalChars,
    filledCount,
    shortFieldCount,
  };
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

/**
 * Strip model process chatter and keep a lean briefing body for injection.
 */
export function sanitizeStrategyResearchBrief(
  raw: string,
  maxChars = STRATEGY_RESEARCH_BRIEF_MAX_CHARS
): string {
  if (!raw?.trim()) return "";

  let text = raw.replace(/\r\n/g, "\n").trim();

  // Prefer content from a stable briefing marker (drop tool-planning preamble).
  const markers = [
    /INTERNAL BRIEFING\b/i,
    /^Category\s*[·:\-—]/im,
    /^##\s*Category\b/im,
  ];
  for (const re of markers) {
    const m = text.search(re);
    if (m > 0) {
      text = text.slice(m);
      break;
    }
  }

  const chatterLine =
    /^(i'?ll research|let me (run|search|look)|i have enough|here'?s the (internal )?briefing|i'?m going to search|searching for|i will (now )?search|running (a few )?search)/i;

  const lines = text.split("\n").filter((line) => {
    const t = line.trim();
    if (!t) return true;
    if (chatterLine.test(t)) return false;
    if (/targeted searches/i.test(t) && t.length < 120) return false;
    return true;
  });

  text = lines
    .join("\n")
    .replace(/searches\.\s*I have enough[^.]*\./gi, "")
    .replace(/Let me run[^.]*\./gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Soft-trim trademark digressions that dominate provisional-name noise
  // (naming lane owns clearance — keep at most a short flag if present).
  text = text
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (/trademark|USPTO|brand confusion|legal exposure|globally recognized/i.test(t)) {
        // Keep one short flag line; drop long legal essays
        return t.length < 160;
      }
      return true;
    })
    .join("\n")
    .trim();

  if (text.length > maxChars) {
    text = text.slice(0, maxChars).replace(/\s+\S*$/, "") + "…";
  }

  return text;
}

export type StrategyResearchPayload = {
  brief: string;
  reasons: string[];
  model?: string;
  createdAt?: string;
  /** Always false in product — research is internal only. */
  surfaceToOwner?: false;
};

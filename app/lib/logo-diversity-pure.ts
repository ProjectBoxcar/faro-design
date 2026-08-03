/**
 * Soft structural diversity checks for Logo Workshop batches.
 * Heuristic only — does not discard candidates; used to retry or warn.
 */

export type LogoStructureKind = "wordmark" | "mark_word" | "integrated" | "unknown";

export type LogoDiversityCandidate = {
  label?: string;
  direction?: string;
  svg?: string;
};

/** Classify a candidate from direction/label text + crude SVG cues. */
export function classifyLogoStructure(c: LogoDiversityCandidate): LogoStructureKind {
  const text = `${c.label ?? ""} ${c.direction ?? ""}`.toLowerCase();
  if (
    /\bwordmark\b/.test(text) ||
    /\btype.?only\b/.test(text) ||
    /\bletter.?spacing\b/.test(text) ||
    /\bno (separate )?symbol\b/.test(text)
  ) {
    return "wordmark";
  }
  if (
    /\bmark\s*\+\s*word\b/.test(text) ||
    /\bmonogram\b/.test(text) ||
    /\bisotype\b/.test(text) ||
    /\bicon\b/.test(text) ||
    /\bsymbol\b/.test(text)
  ) {
    return "mark_word";
  }
  if (
    /\bintegrated\b/.test(text) ||
    /\blockup\b/.test(text) ||
    /\bbadge\b/.test(text) ||
    /\bstacked\b/.test(text) ||
    /\bligature\b/.test(text) ||
    /\bframe\b/.test(text)
  ) {
    return "integrated";
  }

  const svg = c.svg ?? "";
  const pathCount = (svg.match(/<path\b/gi) ?? []).length;
  const shapeCount =
    (svg.match(/<(circle|rect|polygon|ellipse|line)\b/gi) ?? []).length + pathCount;
  const textNodes = (svg.match(/<text\b/gi) ?? []).length;

  if (textNodes > 0 && shapeCount <= 1) return "wordmark";
  if (textNodes > 0 && shapeCount >= 2) return "mark_word";
  if (shapeCount >= 3) return "integrated";
  return "unknown";
}

export type LogoDiversityReport = {
  kinds: LogoStructureKind[];
  uniqueKinds: number;
  /** True when at least 2 distinct structural kinds appear (soft pass). */
  diverseEnough: boolean;
  /** True when all three known slots are present. */
  hasAllThree: boolean;
};

export function assessLogoBatchDiversity(
  candidates: LogoDiversityCandidate[]
): LogoDiversityReport {
  const kinds = candidates.map(classifyLogoStructure);
  const known = new Set(kinds.filter((k) => k !== "unknown"));
  const hasAllThree =
    known.has("wordmark") && known.has("mark_word") && known.has("integrated");
  return {
    kinds,
    uniqueKinds: known.size,
    diverseEnough: known.size >= 2 || candidates.length < 2,
    hasAllThree,
  };
}

/** Whether a soft retry is warranted after a full 3-candidate batch. */
export function shouldRetryForLogoDiversity(report: LogoDiversityReport): boolean {
  if (report.kinds.length < 3) return false;
  return !report.diverseEnough;
}

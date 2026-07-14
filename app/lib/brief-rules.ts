// Pure handover-brief rules (no DB). Used by compileBrief and unit tests.

import type { Section } from "@/lib/methodology";

export type BriefValue = Record<string, unknown>;

export const BRIEF_OMIT_FIELDS: Record<string, string[]> = {
  concept: ["distillation", "eval-against-brief", "filter-test", "recognition-test"],
  manifesto: ["construction", "evaluation"],
  "brief.main-tension": ["classification"],
};

export const BRIEF_OMIT_COLUMNS: Record<string, Record<string, string[]>> = {
  "communication.values": { values: ["confirmed-by"] },
};

export function isNonEmptyValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    return v.some((item) => {
      if (typeof item === "string") return item.trim().length > 0;
      if (item && typeof item === "object") {
        return Object.values(item as Record<string, unknown>).some(
          (cell) => typeof cell === "string" && cell.trim().length > 0
        );
      }
      return false;
    });
  }
  return false;
}

function hasContent(section: Section, value: BriefValue): boolean {
  return (section.fields ?? []).some((f) => isNonEmptyValue(value[f.id]));
}

/** Strip trailing parenthetical authoring hints from field labels. */
export const stripHint = (label: string) => label.replace(/\s*\([^)]*\)\s*$/, "");

/** Section shape as it appears on the handover brief (process fields removed). */
export function trimForBrief(section: Section): Section {
  const omit = new Set(BRIEF_OMIT_FIELDS[section.id] ?? []);
  const colOmit = BRIEF_OMIT_COLUMNS[section.id] ?? {};
  return {
    ...section,
    name: stripHint(section.name),
    fields: (section.fields ?? [])
      .filter((f) => !omit.has(f.id))
      .map((f) => ({
        ...f,
        label: stripHint(f.label),
        columns: f.columns?.filter((c) => !(colOmit[f.id] ?? []).includes(c.id)),
      })),
  };
}

/** Whether a section row would appear on the published brief. */
export function wouldIncludeInBrief(
  section: Section | undefined | null,
  status: string | undefined,
  value: BriefValue
): boolean {
  if (!section || section.internal) return false;
  if (status !== "complete") return false;
  const trimmed = trimForBrief(section);
  return hasContent(trimmed, value);
}

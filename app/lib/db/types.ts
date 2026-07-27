// JSON column payload types. The exact per-section shape is defined by methodology.json
// `fields`; at the DB layer we store a flexible record keyed by field id.

// A section's saved content. Field values are strings, string lists, or table rows
// (arrays of records) depending on the field `type` in methodology.json.
export type SectionFieldValue = string | string[] | Record<string, string>[];
export type SectionValue = Record<string, SectionFieldValue>;

// One scored row inside an evaluation (viability criterion, logo parameter, naming test...).
export type EvalScore = {
  key: string; // criterion/parameter/test id
  label: string;
  level?: "strategic" | "technical" | "non-negotiable" | "warning" | "positive";
  // Result space differs per framework: yes/no (viability), pass/caveat/fail (logo),
  // pass/fail (territory). Stored as a string; the evaluator interprets it.
  result: string;
  notes?: string;
};

// Provenance: the upstream section ids fed to a generation.
export type AiReads = string[];

// Kinds of generated design artifact stored in the assets table.
export type AssetKind = "design_system" | "landing_page" | "deck" | "brand_guidelines" | "logo_concept";

// AI provider backend used for synthesis and asset generation.
export type AiProvider = "anthropic" | "openai-compatible";

// An Asset Studio candidate's content: SVG text for marks (with a dark-ground
// recolor), JSON tokens for palette/typography/verbal assets.
export type AssetPayload = {
  svg?: string;
  svgOnDark?: string;
  tokens?: Record<string, unknown> & {
    fonts?: string[];
    /** When set, this mark is a refinement of another studio asset. */
    refinedFrom?: string;
    refinedFromLabel?: string;
    feedback?: string;
  };
};

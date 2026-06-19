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

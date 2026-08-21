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
export type AssetKind =
  | "design_system"
  | "landing_page"
  | "deck"
  | "brand_guidelines"
  | "logo_concept"
  /** Channel application templates (after identity) */
  | "sms"
  | "email"
  | "ad"
  | "print";

/** Optional channel mockups — not required for core brand package handover */
export const CHANNEL_ASSET_KINDS = ["sms", "email", "ad", "print"] as const;
export type ChannelAssetKind = (typeof CHANNEL_ASSET_KINDS)[number];

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

/** Field shape stored inside a publish snapshot (enough for SectionReadout). */
export type SnapshotField = {
  id: string;
  label: string;
  type: string;
  columns?: { id: string; label: string }[];
  options?: string[];
};

export type SnapshotSection = {
  id: string;
  name: string;
  fields: SnapshotField[];
  value: Record<string, unknown>;
};

export type SnapshotGroup = {
  heading: string;
  sections: SnapshotSection[];
};

export type SnapshotPackageAsset = {
  kind: "design_system" | "landing_page" | "deck";
  id: string;
  name: string;
  variant: string | null;
  html: string;
};

/** Immutable package frozen at publish time. See lib/publish-snapshot.ts. */
export type PublishSnapshotPayload = {
  schemaVersion: 1;
  version: number;
  publishedAt: string;
  project: {
    id: string;
    name: string;
    client_name: string | null;
  };
  brief: {
    groups: SnapshotGroup[];
    markdown: string;
  };
  package: {
    ready: boolean;
    assets: SnapshotPackageAsset[];
    implementPack: {
      downloadName: string;
      files: { path: string; content: string }[];
    } | null;
  };
};

import { sql } from "drizzle-orm";
import { customType, sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { parseStoredJson } from "../json";

/** JSON text that never throws on the way out of SQLite. */
function jsonCol<T>(name: string) {
  return customType<{ data: T; driverData: string }>({
    dataType() {
      return "text";
    },
    toDriver(value: T): string {
      return JSON.stringify(value);
    },
    fromDriver(value: string): T {
      return parseStoredJson<T>(value);
    },
  })(name);
}
import type {
  SectionValue,
  EvalScore,
  AiReads,
  AssetPayload,
  PublishSnapshotPayload,
} from "./types";

// Single-row app config (id always 1). Mirrors the Gut app's settings pattern.
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  designer_name: text("designer_name"),
  // Default reasoning model for synthesis drafts. See lib/ai.ts MODELS.
  default_model: text("default_model").notNull().default("claude-opus-4-8"),
  // AI provider: anthropic (native) or openai-compatible (OpenAI, OpenRouter, Groq, Ollama, etc.).
  ai_provider: text("ai_provider", { enum: ["anthropic", "openai-compatible"] })
    .notNull()
    .default("anthropic"),
  // Optional base URL for openai-compatible providers. Null means the provider's default.
  ai_base_url: text("ai_base_url"),
  // Optional per-provider model override. Falls back to default_model when null.
  ai_model: text("ai_model"),
  // Strategy-lane API key (Settings page). Falls back to ANTHROPIC_API_KEY /
  // OPENAI_API_KEY env. Never used for graphic generation.
  anthropic_api_key: text("anthropic_api_key"),
  // Open Design lane — Anthropic key for the design helper. Not the logo key.
  design_api_key: text("design_api_key"),
  // Logo Workshop — OpenAI-compatible key. Separate so a Claude design key cannot replace it.
  logo_api_key: text("logo_api_key"),
  design_ai_provider: text("design_ai_provider", { enum: ["anthropic", "openai-compatible"] })
    .notNull()
    .default("openai-compatible"),
  design_ai_base_url: text("design_ai_base_url"),
  design_ai_model: text("design_ai_model"),
  debug_mode: integer("debug_mode", { mode: "boolean" }).notNull().default(false),
  created_at: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// One brand engagement.
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  client_name: text("client_name"),
  status: text("status", {
    enum: ["active", "at_risk", "blocked", "archived"],
  })
    .notNull()
    .default("active"),
  // Cached result of the Reality viability gate (caveat = non-blocking concerns).
  viability: text("viability", { enum: ["pending", "pass", "fail", "caveat"] })
    .notNull()
    .default("pending"),
  // Soft-override: owner proceeds past a fail with a logged reason (null = no override).
  viability_override_note: text("viability_override_note"),
  // If true, the Brand Audit is skipped and the Design Plan sources everything as "create".
  greenfield: integer("greenfield", { mode: "boolean" }).notNull().default(false),
  // Own project (no paying client). The viability gate's commercial non-negotiables
  // (recurring sales, budget) are answered but don't block a personal project.
  personal: integer("personal", { mode: "boolean" }).notNull().default(false),
  current_phase: text("current_phase", {
    enum: ["strategic", "planning", "design", "finished"],
  })
    .notNull()
    .default("strategic"),
  // Unguessable token for the public read-only handover link. Null until published.
  share_token: text("share_token").unique(),
  published_at: integer("published_at", { mode: "timestamp" }),
  created_at: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Generic content store: one row per (project, methodology section id) that has data.
// The shape of `value` is defined by the section's `fields` in data/methodology.json.
export const sections = sqliteTable(
  "sections",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Matches a node id in methodology.json, e.g. "brief.central-pattern".
    section_key: text("section_key").notNull(),
    value: jsonCol<SectionValue | null>("value"),
    status: text("status", {
      enum: ["empty", "draft", "complete", "client_submitted"],
    })
      .notNull()
      .default("empty"),
    // True when the current value came from an accepted Claude draft; cleared on manual edit.
    ai_generated: integer("ai_generated", { mode: "boolean" }).notNull().default(false),
    updated_at: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("sections_project_key_idx").on(t.project_id, t.section_key)]
);

// Multi-instance scored frameworks (viability gate, naming/logo/territory candidates).
export const evaluations = sqliteTable(
  "evaluations",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // naming = legacy (mixed confirm + availability); prefer naming_confirm /
    // naming_availability for new writes so availability pass never equals "confirmed name".
    type: text("type", {
      enum: [
        "viability",
        "naming",
        "naming_confirm",
        "naming_availability",
        "logo",
        "territory",
        "concept",
      ],
    }).notNull(),
    // Candidate label (e.g. "Finisterra", "Logo direction B"); null for project-level gates.
    subject: text("subject"),
    scores: jsonCol<EvalScore[]>("scores").notNull().default([]),
    verdict: text("verdict", { enum: ["pass", "caveat", "fail", "blocked"] }),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("evaluations_project_idx").on(t.project_id)]
);

// Asset Studio (phase 2, see 10-asset-studio.md): AI-generated brand assets.
// The AI proposes, scores and discards candidates — approval is exclusively
// human. Only rows with status "approved" (and a real approved_at) exist as far
// as the Brand Package, export, or any sync is concerned.
export const studio_assets = sqliteTable(
  "studio_assets",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["logo", "palette", "typography", "visual-element", "verbal", "photo-spec"],
    }).notNull(),
    // Candidate label from the generator, e.g. "Coordinate Mono".
    label: text("label").notNull(),
    // The generator's one-paragraph rationale, shown on the candidate card.
    direction: text("direction"),
    payload: jsonCol<AssetPayload | null>("payload"),
    status: text("status", {
      enum: ["candidate", "chosen", "approved", "discarded"],
    })
      .notNull()
      .default("candidate"),
    // Set only by the owner pressing Approve — never by generation or scoring.
    approved_at: integer("approved_at", { mode: "timestamp" }),
    // Optional second signature from a designer reviewing via the share link.
    // Never blocks the owner; flagged assets still ship if the owner says so.
    audit_status: text("audit_status", { enum: ["audited", "flagged"] }),
    audit_note: text("audit_note"),
    // The skeptical-judge evaluation this candidate was scored by.
    evaluation_id: text("evaluation_id").references(() => evaluations.id),
    model: text("model"),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("studio_assets_project_kind_idx").on(t.project_id, t.kind)]
);

// Audit log of Claude drafts, for provenance ("drafted from …"), regenerate, and compare.
export const ai_generations = sqliteTable(
  "ai_generations",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    section_key: text("section_key").notNull(),
    model: text("model").notNull(),
    // Upstream section ids fed as context (provenance).
    reads: jsonCol<AiReads>("reads").notNull().default([]),
    output: text("output"),
    accepted: integer("accepted", { mode: "boolean" }).notNull().default(false),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("ai_generations_project_idx").on(t.project_id)]
);

// Generated brand design artifacts: DESIGN.md, landing page, deck, brand guidelines, etc.
// Produced by the Open Design skill pipeline absorbed into Brand App.
export const design_jobs = sqliteTable(
  "design_jobs",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["design_system", "landing_page", "deck", "mockups", "channels"],
    }).notNull(),
    count: integer("count").notNull().default(3),
    design_system_id: text("design_system_id"),
    status: text("status", { enum: ["queued", "running", "complete", "failed"] })
      .notNull()
      .default("queued"),
    asset_ids: jsonCol<string[]>("asset_ids").notNull().default([]),
    error: text("error"),
    /** Improve-with-feedback payload (JSON): feedback, baseHtml, baseAssetId */
    refine_meta: jsonCol<{
      feedback?: string;
      baseHtml?: string;
      baseAssetId?: string;
    } | null>("refine_meta"),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updated_at: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("design_jobs_project_kind_idx").on(t.project_id, t.kind)]
);

export const logo_jobs = sqliteTable(
  "logo_jobs",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    action: text("action", { enum: ["generate", "variations"] }).notNull(),
    source_asset_id: text("source_asset_id"),
    feedback: text("feedback"),
    status: text("status", { enum: ["queued", "running", "complete", "failed"] })
      .notNull()
      .default("queued"),
    error: text("error"),
    /** Model output saved before the logos are inserted, so a restart can finish. */
    checkpoint: text("checkpoint"),
    discarded: integer("discarded").notNull().default(0),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updated_at: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("logo_jobs_project_idx").on(t.project_id)]
);

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: [
        "design_system",
        "landing_page",
        "deck",
        "brand_guidelines",
        "logo_concept",
        "sms",
        "email",
        "ad",
        "print",
      ],
    }).notNull(),
    // Proposal variant label: A, B, C. Null for legacy single assets.
    variant: text("variant"),
    // Whether this proposal is the chosen one for its kind.
    selected: integer("selected", { mode: "boolean" }).notNull().default(false),
    // For applications (landing/deck/channels): the design_system they follow.
    design_system_id: text("design_system_id"),
    name: text("name").notNull(),
    // The generated artifact (HTML, markdown, or raw design file content).
    html: text("html"),
    // The composed prompt used to generate this asset, for provenance / regeneration.
    prompt: text("prompt"),
    status: text("status", {
      enum: ["empty", "draft", "complete"],
    })
      .notNull()
      .default("draft"),
    ai_generated: integer("ai_generated", { mode: "boolean" }).notNull().default(true),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updated_at: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("assets_project_idx").on(t.project_id)]
);

// Frozen handover package at publish time. Share routes prefer the current
// snapshot so later edits do not rewrite a brief already sent to a designer.
// See docs/08-handover-spec.md and lib/publish-snapshot.ts.
export const publish_snapshots = sqliteTable(
  "publish_snapshots",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Token used for /share/[token] when this version was current.
    share_token: text("share_token").notNull(),
    // Monotonic per project: 1, 2, 3… on each publish.
    version: integer("version").notNull(),
    // At most one current row per project (enforced in app code).
    is_current: integer("is_current", { mode: "boolean" }).notNull().default(true),
    payload: jsonCol<PublishSnapshotPayload>("payload").notNull(),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("publish_snapshots_project_idx").on(t.project_id),
    index("publish_snapshots_token_idx").on(t.share_token),
    uniqueIndex("publish_snapshots_project_version_idx").on(t.project_id, t.version),
  ]
);

// Cross-project learning: outcomes the owner approved, used to steer future
// strategy / logo / design generation (app memory — not model fine-tuning).
export const brand_memory = sqliteTable(
  "brand_memory",
  {
    id: text("id").primaryKey(),
    // Source project (kept even if project later archived; no hard FK cascade so
    // learnings survive accidental project deletes if we ever soft-delete).
    project_id: text("project_id"),
    project_name: text("project_name"),
    // Which engine should read this learning.
    engine: text("engine", { enum: ["strategy", "logo", "design", "all"] })
      .notNull()
      .default("all"),
    // What kind of signal this is.
    kind: text("kind", {
      enum: ["strategy_outcome", "logo_preference", "design_preference", "taste", "package"],
    }).notNull(),
    title: text("title").notNull(),
    // Short natural-language summary injected into prompts.
    body: text("body").notNull(),
    // Optional structured extras (labels, hexes, verdicts…).
    meta: jsonCol<Record<string, unknown>>("meta").notNull().default({}),
    // Higher = more important when ranking (recent package = high).
    weight: integer("weight").notNull().default(1),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("brand_memory_engine_idx").on(t.engine),
    index("brand_memory_project_idx").on(t.project_id),
  ]
);

// ── Content Studio (scaffold — see docs/12-content-studio.md) ───────────────
// Locked brand profile + raw media → monthly social content calendar.
// project_id null = Workflow B (inferred starter brand, no FARO package).

export const content_profiles = sqliteTable(
  "content_profiles",
  {
    id: text("id").primaryKey(),
    project_id: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    source: text("source", { enum: ["project", "inferred"] }).notNull(),
    brand_name: text("brand_name").notNull(),
    locked: integer("locked", { mode: "boolean" }).notNull().default(true),
    // Full BrandProfile JSON (lib/content-studio/types.ts)
    payload: jsonCol<Record<string, unknown>>("payload").notNull(),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("content_profiles_project_idx").on(t.project_id)]
);

export const content_raw_assets = sqliteTable(
  "content_raw_assets",
  {
    id: text("id").primaryKey(),
    profile_id: text("profile_id")
      .notNull()
      .references(() => content_profiles.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mime_type: text("mime_type").notNull(),
    kind: text("kind", { enum: ["image", "video", "unknown"] }).notNull().default("unknown"),
    storage_path: text("storage_path"),
    /** MediaAnalysisCard JSON — vision pass before month plan */
    analysis: jsonCol<Record<string, unknown> | null>("analysis"),
    /** AssetOwnerMeta JSON — tags / exclude (P4) */
    owner_meta: jsonCol<Record<string, unknown> | null>("owner_meta"),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("content_raw_assets_profile_idx").on(t.profile_id)]
);

export const content_calendars = sqliteTable(
  "content_calendars",
  {
    id: text("id").primaryKey(),
    profile_id: text("profile_id")
      .notNull()
      .references(() => content_profiles.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    status: text("status", {
      enum: ["draft", "generating", "ready", "exported"],
    })
      .notNull()
      .default("draft"),
    /** ContentMonthStrategy JSON (organic month plan) */
    strategy: jsonCol<Record<string, unknown> | null>("strategy"),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("content_calendars_profile_idx").on(t.profile_id)]
);

export const content_posts = sqliteTable(
  "content_posts",
  {
    id: text("id").primaryKey(),
    calendar_id: text("calendar_id")
      .notNull()
      .references(() => content_calendars.id, { onDelete: "cascade" }),
    day_index: integer("day_index").notNull(),
    date_iso: text("date_iso").notNull(),
    platforms: jsonCol<string[]>("platforms").notNull().default([]),
    caption: text("caption").notNull().default(""),
    hashtags: jsonCol<string[]>("hashtags").notNull().default([]),
    variants: jsonCol<unknown[]>("variants").notNull().default([]),
    source_asset_ids: jsonCol<string[]>("source_asset_ids").notNull().default([]),
    status: text("status", { enum: ["draft", "approved", "rejected"] })
      .notNull()
      .default("draft"),
    notes: text("notes"),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updated_at: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("content_posts_calendar_idx").on(t.calendar_id)]
);

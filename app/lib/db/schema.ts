import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import type { SectionValue, EvalScore, AiReads } from "./types";

// Single-row app config (id always 1). Mirrors the Gut app's settings pattern.
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  designer_name: text("designer_name"),
  // Default reasoning model for synthesis drafts. See lib/anthropic.ts MODELS.
  default_model: text("default_model").notNull().default("claude-opus-4-8"),
  // Anthropic API key set from the in-app Settings page (local, single-user).
  // Falls back to the ANTHROPIC_API_KEY env var when null. Stored plaintext in
  // the local SQLite file (gitignored) — fine for a personal local tool.
  anthropic_api_key: text("anthropic_api_key"),
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
  // Cached result of the Reality viability gate.
  viability: text("viability", { enum: ["pending", "pass", "fail"] })
    .notNull()
    .default("pending"),
  // If true, the Brand Audit is skipped and the Design Plan sources everything as "create".
  greenfield: integer("greenfield", { mode: "boolean" }).notNull().default(false),
  // Own project (no paying client). The viability gate's commercial non-negotiables
  // (recurring sales, budget) are answered but don't block a personal project.
  personal: integer("personal", { mode: "boolean" }).notNull().default(false),
  current_phase: text("current_phase", {
    enum: ["strategic", "planning", "design"],
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
    value: text("value", { mode: "json" }).$type<SectionValue>(),
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
    type: text("type", {
      enum: ["viability", "naming", "logo", "territory", "concept"],
    }).notNull(),
    // Candidate label (e.g. "Finisterra", "Logo direction B"); null for project-level gates.
    subject: text("subject"),
    scores: text("scores", { mode: "json" }).$type<EvalScore[]>().default([]),
    verdict: text("verdict", { enum: ["pass", "caveat", "fail", "blocked"] }),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("evaluations_project_idx").on(t.project_id)]
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
    reads: text("reads", { mode: "json" }).$type<AiReads>().default([]),
    output: text("output"),
    accepted: integer("accepted", { mode: "boolean" }).notNull().default(false),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("ai_generations_project_idx").on(t.project_id)]
);

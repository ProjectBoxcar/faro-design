# 04 — Data Model (SQLite via Drizzle)

Single SQLite file at `app/data/brand.db`. Drizzle ORM (better-sqlite3), same setup as the Gut app.

## Design choice: config-driven sections, generic storage

The methodology has ~60 sections with heterogeneous shapes. Rather than one table per section, the
**structure** lives in `app/data/methodology.json` (the taxonomy from `02-methodology-model.md`) and
the **content** is stored generically as JSON keyed by section id. This keeps the schema tiny and
lets the methodology evolve by editing JSON, not migrations. Evaluations and AI runs, which are
multi-instance and queryable, get their own tables.

## Tables

### `projects`
One brand engagement.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | nanoid |
| `name` | text not null | brand / engagement name |
| `client_name` | text | |
| `status` | text enum | `active` \| `at_risk` \| `blocked` \| `archived` (default `active`) |
| `viability` | text enum | `pending` \| `pass` \| `fail` — cached result of the gate |
| `greenfield` | integer bool | if true, Brand Audit is skipped |
| `current_phase` | text enum | `strategic` \| `planning` \| `design` (default `strategic`) |
| `share_token` | text unique | unguessable token for the handover link (null until published) |
| `published_at` | integer ts | when the handover was last published |
| `created_at` / `updated_at` | integer ts | `unixepoch()` |

### `sections`
Generic content store. One row per (project, section id) that has data.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | nanoid |
| `project_id` | text not null FK → projects.id (cascade) | |
| `section_key` | text not null | matches a node id in methodology.json, e.g. `brief.central-pattern` |
| `value` | text json | shape defined by the section's `fields` in methodology.json |
| `status` | text enum | `empty` \| `draft` \| `complete` \| `client_submitted` (default `empty`) |
| `ai_generated` | integer bool | true if current value came from a Claude draft (cleared on manual edit) |
| `updated_at` | integer ts | |

Unique index on `(project_id, section_key)`.

### `evaluations`
Multi-instance scored frameworks (a project can score several logo/naming/territory candidates).

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text not null FK | |
| `type` | text enum | `viability` \| `naming` \| `logo` \| `territory` \| `concept` |
| `subject` | text | candidate label (e.g. "Finisterra", "Logo direction B"); null for project-level gates |
| `scores` | text json | array of `{parameter/criterion, level?, result/answer, notes}` |
| `verdict` | text enum | `pass` \| `caveat` \| `fail` \| `blocked` |
| `created_at` | integer ts | |

### `ai_generations`
Audit log of Claude drafts, so a section can show provenance and be regenerated/compared.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text not null FK | |
| `section_key` | text not null | |
| `model` | text | `claude-opus-4-8` etc. |
| `reads` | text json | upstream section ids fed as context (provenance) |
| `output` | text | the generated draft |
| `accepted` | integer bool | whether the designer committed it to the section |
| `created_at` | integer ts | |

### `settings`
Single-row app config (id default 1): `designer_name`, `default_model`, `debug_mode`. Mirrors Gut.

## Notes

- All JSON columns use Drizzle's `text(..., { mode: "json" }).$type<...>()` with TS types in
  `lib/db/types.ts` derived from the section field definitions.
- Timestamps as `integer(..., { mode: "timestamp" })` defaulting to `sql\`(unixepoch())\``.
- `foreign_keys = ON` and `journal_mode = WAL` pragmas (same as Gut's `lib/db/index.ts`).
- Migrations live in `app/drizzle/`. Generate with `npm run db:generate`, apply with `npm run db:migrate`.

# 07 — Roadmap (build order)

## Step 1 — Foundations (this pass)
- Design docs (`01`–`09`, `CLAUDE.md`, `README.md`). ✅
- Scaffold Next.js app mirroring Gut config (package.json, tsconfig, tailwind, next.config, eslint).
- Drizzle schema + `db:migrate` working; `settings` + `projects` + `sections` + `evaluations` +
  `ai_generations` tables.
- `methodology.json` seed (English taxonomy from `02`) + `lib/methodology.ts` loader/typing.
- Project list + create + open. Workspace shell with phase/pillar/section nav rendering from
  methodology.json (sections show as stubs). App boots on `npm run dev`.

## Step 2 — Strategic capture
- `SectionForm` driven by `fields` + trigger questions; save to `sections`; status dots.
- Viability Gate evaluator (12 criteria, go/no-go rule, project status update).
- All Reality / Identity input sections fillable.

## Step 3 — AI synthesis (hybrid)
- `lib/anthropic.ts` + `lib/prompts/*`; `/api/generate` with dependency gating + provenance.
- `SynthesisPanel` (Generate → edit → accept; "drafted from" line).
- Cover: Strategic Brief, Strategic Document, Communication block, Image pattern-analysis + contrast,
  survey-question derivation (Haiku).

## Step 4 — Planning
- Brand Concept (one-shot first; conversational distillation later).
- Reusable Insights, Manifesto.
- Brand Audit (per-asset table) + Design Plan (priorities auto-derived from audit).

## Step 5 — Handover link
- Compiled read-only `share/[token]` page: Concept + Brief + Manifesto + Design Plan + strategy
  context. `/api/publish` mints token. Copy-as-Markdown. Internal sections excluded.

## Step 6 — Design-phase evaluators (secondary)
- Naming (6 tests + availability checklist, multi-candidate).
- Visual Territory (build 2–3, 4-filter eval, definition).
- Logo Evaluation (14 parameters, 2 levels, multi-candidate).

## Step 7 — Polish (later)
- Client intake share link (flow B) with section scoping.
- Conversational concept distillation.
- Asset references / images on handover.
- Backups, Fly.io decision (separate, like Gut).

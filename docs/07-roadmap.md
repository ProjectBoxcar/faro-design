# 07 — Roadmap (build order)

Status as of 2026-07-14 (Tier A gap close): Steps 1–5 largely **done**; design-phase (6) and polish (7) still open.

## Step 1 — Foundations — ✅
- Design docs (`01`–`09`, `CLAUDE.md`, `README.md`).
- Scaffold Next.js app; Drizzle schema + migrations; `methodology.json` + loader.
- Project list / create / open; boots on `npm run dev` → **http://localhost:3100**.

## Step 2 — Strategic capture — ✅ (viability upgraded)
- Field-driven forms + status; Reality / Identity fillable; Quick Start intake.
- Viability Gate: auto-eval, hub panel (pass / caveat / fail), re-check, soft override with note.
- Re-runs when Reality gate inputs change.

## Step 3 — AI synthesis (hybrid) — ✅ core / prompts specialized for flagship
- `lib/anthropic.ts` + `lib/prompts` quality bars; `/api/generate` with dependency gating + provenance.
- Generate → edit → accept; **“Drafted from: …”** UI line.
- Flagship sections: Brief, Concept, Manifesto, Communication block; survey design on **Haiku**.
- Unit tests: gates, brief omit rules, viability scoring (`npm test`).

## Step 4 — Planning — ✅ functional
- Brand Concept (one-shot); Insights, Manifesto; Audit + Design Plan (AI draft; auto-seed from audit still optional).
- Conversational concept distillation → step 7.

## Step 5 — Handover link — ✅
- `share/[token]`; publish / unpublish; Markdown download; internal sections + process fields excluded.
- Snapshot-on-publish still open (live from DB).

## Step 6 — Design-phase evaluators (secondary) — partial
- Naming technical availability check exists; multi-candidate eval / territory / logo UIs still generic forms.

## Step 7 — Polish (later)
- Client intake share link (flow B) with section scoping.
- Conversational concept distillation.
- Asset references / images on handover.
- Backups (`npm run backup`) ✅; Fly.io decision (separate, like Gut).

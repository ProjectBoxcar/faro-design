# Project rules for Claude

You are working on the **Brand App** — a personal tool Leonardo (a brand designer) uses to run the
**Finisterra methodology**: capture a brand engagement, synthesize concept + strategy, and hand a
brief to a graphic designer via a shareable link. The rules below are LOAD-BEARING.

## Language

- **The entire app is in English** — UI, code, comments, and all methodology content.
- The Finisterra source files (`Finisterra_md_files/`) are Spanish. When seeding content into the app,
  **translate to English**. Keep the canonical English names from `02-methodology-model.md`
  (e.g. Realidad → Reality, Brief Estratégico → Strategic Brief). Don't invent new names.
- The Spanish source files are **read-only reference**. Never edit or delete them.

## Data safety

Project data is the user's real client work and is irreplaceable. It lives in `app/data/brand.db`
(SQLite, single file).

- **For schema changes: ALWAYS use `npm run db:migrate`** (generate a migration, then apply).
  Never `npm run db:push` after initial setup — push can drop columns and destroy data.
- **`app/data/` is gitignored and must stay that way.** Never commit `brand.db` or backups.
- Schema changes should be **additive** (new columns/tables). Avoid `DROP`/`RENAME`/non-null
  backfills without a migration plan. Suggest a backup before any destructive DB operation.

## Scope

- **Primarily single-user (the designer).** Clients touch only intake sections, via per-project
  share links — no client accounts, no auth system, no multi-tenancy, no paywalls. Don't add
  "what if an agency uses it" features unless asked.
- **Local self-hosted.** Runs on `npm run dev` on Windows. No Docker, no CI/CD. (Fly.io is a
  later, separate decision — see Gut app's hosting plan.)
- The design docs (`01`–`09`) are the source of truth for what's in/out of scope.

## Methodology fidelity

- The methodology is a **pipeline with dependencies** (see `02-methodology-model.md` §Dependencies).
  Synthesis sections read from upstream sections; don't let a section generate before its inputs exist.
- **Respect the resolver model**: some sections are client-input, some designer-only, some
  collaborative. The internal **Evaluation Criteria** (viability gate) is designer-only and must
  never appear on a client share link.
- The methodology decides; don't ask the user to adjudicate things the framework already scores.
  Surface conclusions, not raw process. (Mirrors how Leonardo wants the Gut app to behave.)

## AI behavior

- **Hybrid**: synthesis sections offer a "Generate draft" action; output is always **editable** and
  never auto-committed. The designer reviews and accepts.
- Default reasoning model is **Claude Opus 4.8** (`claude-opus-4-8`) — synthesis quality is the
  product. Use **Haiku 4.5** (`claude-haiku-4-5-20251001`) only for mechanical derivation
  (e.g. turning identity claims into survey questions). See `05-ai-architecture.md`.
- Enable **prompt caching** on the static methodology system prompt.
- AI must cite which upstream sections it drew from, so the designer can trace a draft.

## Style

- Leonardo prefers **short answers** — minimal preamble, no end-of-turn recap unless he asks.
- UX should be **guided**: structured forms with clear options and the methodology's trigger
  questions inline. Freeform text is secondary; don't bury structure behind chat.

## When in doubt

- Read the design docs in this folder first, then `02-methodology-model.md` for the taxonomy.
- If a request conflicts with data-safety or the single-user scope, flag it before acting.
- Keep changes minimal and reversible. Ask before destructive operations.

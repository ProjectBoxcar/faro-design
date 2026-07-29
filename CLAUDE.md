# Project rules for Claude

You are working on the **Brand App** — a personal local tool that runs the **Finisterra methodology**:
capture a brand engagement, synthesize concept + strategy, and hand a brief to a graphic designer
via a shareable link. Leonardo operates it; the in-app journey is written for a **brand owner**
(plain language, guided review). Strategist and owner may be the same person. The rules below are
LOAD-BEARING.

## Language

- **The entire app is in English** — UI, code, comments, and all methodology content.
- The Finisterra source files (`reference/finisterra/`) are Spanish. When seeding content into the app,
  **translate to English**. Keep the canonical English names from `docs/02-methodology-model.md`
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

- **Primarily single-user (local operator).** One person runs projects on this machine. No client
  accounts, multi-tenancy, or paywalls. Client-scoped intake links are deferred (roadmap step 7).
  Don't add "what if an agency uses it" features unless asked.
- **Local self-hosted.** Runs on `npm run dev` on Windows. No Docker, no CI/CD. (Fly.io is a
  later, separate decision — see Gut app's hosting plan.)
- The design docs in `docs/` (`01`–`11`) are the source of truth for what's in/out of scope.
  AI engine routing is fixed in **`docs/11-ai-lanes.md`**.

## Methodology fidelity

- The methodology is a **pipeline with dependencies** (see `docs/02-methodology-model.md` §Dependencies).
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
  (e.g. turning identity claims into survey questions). See `docs/05-ai-architecture.md`.
- Enable **prompt caching** on the static methodology system prompt.
- AI must cite which upstream sections it drew from, so the designer can trace a draft.

## AI lanes (three engines) — LOAD-BEARING

Full rules: **`docs/11-ai-lanes.md`**. Code: `app/lib/ai.ts`, `app/lib/ai-lanes.ts`, `app/lib/settings.ts`.

| Lane | Uses | Entry | Never |
|------|------|-------|--------|
| **Strategy** | Anthropic (default) / strategy Settings | `generateStrategyText` | OD daemon, logo keys |
| **Logo Workshop** | OpenAI → Gemini fallback | `generateLogoText` | OD daemon, strategy key as logo |
| **Design Studio** | Open Design daemon + Anthropic BYOK | `generateDesignText` | OpenAI, Gemini, direct “any chat” substitute |

- **Do not** merge lanes, add a smart router, or fall through Design Studio → OpenAI/Gemini if OD is down.
- **Do not** use the logo OpenAI key for identity systems / mockups, or strategy Anthropic for logos.
- Settings **AI setup** must show **three independent statuses**, not one “AI OK”.
- Orchestration (resume, jobs, packages) only wraps these engines — it never rewires them.

## Style

- Leonardo prefers **short answers** — minimal preamble, no end-of-turn recap unless he asks.
- UX should be **guided**: structured forms with clear options and the methodology's trigger
  questions inline. Freeform text is secondary; don't bury structure behind chat.

## Intervention workflow

- For every non-trivial change, bug, audit, or feature, follow `.devin/skills/evidence-led-intervention/SKILL.md`: combine source-of-truth docs, memories, code evidence, parallel subagent audits, authoritative research, layered verification, and a synthetic end-to-end journey check when relevant.
- Subagents provide evidence; reconcile their advice against this file and the current code before acting.

## When in doubt

- Read the design docs in `docs/` first, then `docs/02-methodology-model.md` for the taxonomy.
- If a request conflicts with data-safety or the single-user scope, flag it before acting.
- Keep changes minimal and reversible. Ask before destructive operations.

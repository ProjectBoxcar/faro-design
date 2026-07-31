# 11 — AI lanes (three engines)

**Load-bearing product invariant.** Do not merge, fall through, or “pick the nearest key.”  
Orchestration (resume, job UI, AI setup, packages) sits *around* these engines; it never rewires them.

Related: `docs/05-ai-architecture.md` (prompts, hybrid review). Code entry: `app/lib/ai.ts`, config: `app/lib/settings.ts`, labels/guards: `app/lib/ai-lanes.ts`.

---

## The three engines

| Lane | Journey step | Engine | Keys / path | Entry functions | `engine` tag on success |
|------|--------------|--------|-------------|-----------------|-------------------------|
| **strategy** | Intake, Express, section draft, viability, naming, synthesis | Direct strategy provider (default **Anthropic**) | Strategy Settings / `ANTHROPIC_API_KEY` (or OpenAI-compatible if deliberately set) | `generateStrategyText`, `generateText` (default lane) | `strategy-direct` |
| **logo** | Logo Workshop only | **OpenAI first**, **Gemini fallback** on missing key / retriable errors | OpenAI: graphics Settings / `OPENAI_API_KEY`; Gemini: `GEMINI_API_KEY` | `generateLogoText` (`studio.ts`) | `openai-direct` or `gemini-direct` |
| **design** | Design Studio: identity system, landing, deck, mockups | **Open Design daemon only** + Anthropic BYOK | Anthropic key via OD (`getOpenDesignDaemonKey`); daemon on port **7456** | `generateDesignText` (`design.ts`, jobs) | `open-design-daemon` |

Intended production defaults:

> **Strategy = Anthropic · Logo = OpenAI (Gemini backup) · Design Studio = Anthropic through Open Design.**

Why separate:

- Strategy needs long-context methodology synthesis.
- Logos need model-written SVG (OpenAI / Gemini paths), not the OD visual-system stack.
- Identity systems, UI mockups, and layout artifacts are what **Open Design** is optimized for — Anthropic is the model *behind* OD, not a free-for-all chat call inside Faro.

---

## Hard rules (never break)

1. **No cross-lane key fallback for generation.**
   - Design Studio **must not** call OpenAI or Gemini if OD is down → fail loud (“start Open Design / fix Anthropic BYOK”).
   - Logo Workshop **must not** use the strategy Anthropic key or the OD daemon.
   - Strategy **must not** route through the OD daemon.

2. **No “smart” router** that picks any configured key for any job.

3. **One public entry per lane** for new code:
   - Strategy → `generateStrategyText` (or `generateText` without `lane: "design"`).
   - Logo → `generateLogoText` only.
   - Design → `generateDesignText` only (or `generateText({ lane: "design" })`).

4. **Design Studio Anthropic** is BYOK **into the Open Design daemon**, not the Anthropic SDK path used for strategy drafts.

5. **Brand memory** may *tag* learnings by engine (`strategy` | `logo` | `design` | `all`) but must not change which engine runs a job.

6. **Settings → AI setup** always shows **three independent statuses**, never a single “AI connected” boolean.

---

## Config resolution (summary)

| Need | Resolver | Notes |
|------|----------|--------|
| Strategy key | `getApiKey` / `getProviderConfig` | Settings strategy key, then env |
| Logo OpenAI | `getLogoApiConfig` | Non-`sk-ant` graphics key, else `OPENAI_API_KEY` |
| Logo Gemini | `getGeminiConfig` / `hasGeminiKey` | Env only; fallback only |
| OD Anthropic | `getOpenDesignDaemonKey` | `OPEN_DESIGN_API_KEY`, Anthropic graphics key (`sk-ant`), or strategy Anthropic when provider is Anthropic |
| OD readiness | key + `isOpenDesignDaemonUp()` | Both required for Design Studio generate |

Storage quirk: Settings still has one “graphics” key field (`design_api_key`). Shape decides consumer (`sk-ant` → OD; other `sk-…` → logo). Prefer clear labels in UI over merging behavior.

---

## Forbidden combinations

| If you are implementing… | Do not call / use |
|--------------------------|-------------------|
| Logo candidates / logo judge | `generateViaOpenDesign`, `generateDesignText`, strategy key as logo key |
| Identity / landing / deck / mockups | `generateLogoText`, OpenAI, Gemini, `callStrategyProvider` for the artifact |
| Express / section generate / viability | OD daemon, logo keys |

On success, callers may assert `result.engine` is in the allowed set for that lane (`assertEngineForLane` in `lib/ai-lanes.ts`).

---

## Journey lifecycle notes (owner path)

- **Quick Start** persists all six answers on `intake.answers` *before* AI expansion (`intake.taste` is still mirrored for design).
- **Express** drafts stay `draft` until the owner **Approves**; pipeline status (including cancel) is durable on `express.pipeline`.
- **Brand name** must be confirmed (pick or keep working title) before first logo generate; availability research uses `naming_availability`, not confirm.
- **Express approve** freezes a **strategy brief** share (not the full brand package). When Design Studio finals land, lifecycle re-freezes package on the same token when ready.
- **Phases:** `strategic` → `planning` (strategy ready) → `design` (logo approved) → `finished` (package + share).

See pilot audit: `docs/reports/2026-07-31-city-home-pilot-audit.md`.

---

## Failure policy

| Failure | Correct product behavior |
|---------|---------------------------|
| Strategy key missing | Disable / error on strategy generate only |
| Logo OpenAI + Gemini both missing | Logo Workshop refuses; strategy and Design Studio unaffected |
| OpenAI logo 429/auth + Gemini present | Gemini fallback (logo only) |
| OD daemon down | Design Studio refuses; **no** OpenAI/Gemini substitute |
| OD Anthropic missing | Design Studio refuses; logos still work if OpenAI/Gemini set |
| Anthropic down / rate-limited for OD | Design Studio fails loud + resume later; **do not** point OpenAI at OD “just in case” |

Resume, retry, and job UI must preserve the same engine on resume — never “retry on a different lane.”

### Do I need an OpenAI key for Open Design?

**No.** Open Design (Design Studio) is Anthropic BYOK only. An OpenAI key belongs on **Logo Workshop**, not as an OD failover. Putting OpenAI “on OD” would either be ignored or would break the visual-system path this product relies on.

Recommended setup:

1. **Anthropic** — strategy + Design Studio (OD BYOK; often one key)  
2. **OpenAI** — Logo Workshop  
3. **Gemini** (optional) — logo fallback only when OpenAI fails  

Code: `lib/ai-failure.ts` classifies errors without cross-engine advice.

---

## Agent / contributor checklist

Before merging AI-related changes:

- [ ] New generate path uses exactly one of the three entry functions.
- [ ] No new shared helper that accepts “any key.”
- [ ] Settings → AI setup still lists three engines.
- [ ] Unit tests in `lib/__tests__/ai-lanes.test.ts` still pass.
- [ ] You did not “temporarily” use strategy or logo to unblock Design Studio.

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-29 | Initial invariant doc; code guards + three-engine Settings AI setup. |
| 2026-07-29 | User-facing label: “Engine health” → “AI setup”. |

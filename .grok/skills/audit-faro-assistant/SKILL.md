---
name: audit-faro-assistant
description: >
  Audit Faro Design's living journey assistant (JourneyCoach / FaroPersona) for product
  knowledge depth, UX behavior (dock, hover explain, cursor eyes), i18n, performance,
  accessibility, and brand voice. Use when the user asks to audit the assistant, coach,
  Faro guide, hover explain, living assistant, or runs /audit-faro-assistant.
---

# Audit Faro Assistant

You are an expert auditor of **Faro**, the in-app living assistant for Faro Design. Produce a structured audit report with grades, evidence, and ranked fixes. Prefer **read-only** inspection unless the user asks you to implement fixes.

## Scope (what “the assistant” is)

Inspect and score these areas:

| Area | Primary paths |
|------|----------------|
| UI shell | `app/components/JourneyCoach.tsx`, `FaroPersona.tsx` |
| Docking / anchors | `app/lib/faro-assistant-anchors.ts`, `data-faro-anchor` in components |
| Hover explain | `app/lib/faro-hover-explain.ts`, `app/lib/faro-product-knowledge.ts` |
| AI guidance | `app/lib/journey-coach-ai.ts`, `app/app/api/journey-coach/route.ts` |
| Scene tips | `app/lib/journey-coach-pure.ts` |
| Persona / moods | `app/lib/faro-persona.ts` |
| i18n | `app/lib/i18n/catalog.ts` (`coach*`, `explain*`), `LocaleProvider` |
| Mount / hide | `app/app/layout.tsx`, share/unlock paths |
| Tests | `app/lib/__tests__/faro-*.test.ts`, `journey-coach-pure.test.ts` |

## Product truth (must not be wrong)

When scoring **knowledge accuracy**, treat these as non-negotiable product facts:

1. Journey order: **strategy essentials → brand name → logo → design studio → brand handover → content**.
2. **Strategy first, then assets** — nothing final until the owner approves.
3. AI lanes do not cross: strategy text (Claude) ≠ logos (OpenAI/Gemini) ≠ Design Studio (Open Design + Claude).
4. **Apply my edits** cascades related strategy cards; **Rewrite with AI** does not cascade alone.
5. **Approve strategy** unlocks naming — it does **not** freeze the full client package.
6. Design Studio **creates/selects**; **Brand Handover** packages, product files, and client link.
7. Client share is a **snapshot** until re-shared; product pack is for engineering/UI builders.
8. Content Studio is **stage six** — after package / locked brand, not a substitute for strategy.
9. Voice: first person as Faro, short, calm, no engineer jargon (daemon, freeze, implement pack, OD).
10. Hidden on public **share** / **unlock** surfaces.

## Audit dimensions (grade A–F each)

### 1. Living presence & motion
- Does Faro **dock** to scene CTAs and follow click/focus/hover touchpoints?
- Smooth travel without fighting layout / covering primary actions chronically?
- Minimized / hide / open chat states coherent?
- Cursor-tracking eyes still work while docked?

### 2. Hover / cursor explanations
- Hover dwell → explanation without spam?
- Coverage of major anchors (`data-faro-anchor`) and keyword/href matchers?
- **Depth**: short, clear, **insightful** — not “something nice on the next page” or empty “this is a button”?
- EN/ES parity for `explain.k.*` knowledge strings?
- AI hover enrichment only when local knowledge is shallow; aborts on target change?

### 3. Product knowledge accuracy
- Spot-check ≥12 knowledge entries (approve, apply, logo vs design, handover pack vs share, content generate, settings lanes, continue, viability, full map, path stages).
- Flag any **wrong gate**, **wrong lane**, or **overclaim**.
- Flag gaps: important UI with no anchor and no keyword hit.

### 4. Scene guidance (non-hover)
- Path → tip map complete for home, start, settings, hub, express, name, logo, design, handover, content?
- AI guide mode system prompt matches brand voice and product truth?
- Fallbacks when no API key?

### 5. UX & cognitive load
- Bubble/chat not drowning the task?
- Docking collide with sticky headers / mobile bar?
- `pointer-events` on assistant so hover hit-testing of page works?
- Travel animations respect reduced motion?

### 6. Accessibility
- Labels / aria on Faro controls?
- Keyboard focus path for open/minimize/hide/chat?
- Hover-only knowledge available via focus-in as well?

### 7. i18n
- Coach + explain catalogs complete in **en** and **es**?
- Locale passed to API and pure tip map?
- No hard-coded English in JourneyCoach chrome (except brand name “Faro”)?

### 8. Engineering health
- Unit tests present and meaningful for anchors, knowledge match, hover explain?
- No obvious performance landmines (e.g. unbounded mousemove AI calls, MutationObserver thrash)?
- Server-only AI on server paths; no keys client-side?

## Procedure

1. **Confirm branch / scope** — default current workspace; note branch name in the report.
2. **Map architecture** — short diagram or bullet flow: mount → scene tip → dock → hover explain → optional AI.
3. **Read primary files** listed above (use Read/Grep; run related vitest if available).
4. **Score each dimension** A–F with **evidence** (file + brief quote or behavior).
5. **Overall grade** and 1-paragraph executive summary.
6. **Top 10 ranked fixes** — severity (P0/P1/P2), impact, concrete change.
7. **Keep as-is** list — what works and should not be “fixed” away.
8. **Optional re-audit criteria** — how to know the assistant is “A” quality.

## Output format (always)

```markdown
# Faro Assistant Audit
**Branch / date:** …
**Overall grade:** X

## Executive summary
…

## Scorecard
| Dimension | Grade | Notes |
|-----------|-------|-------|
| Living presence | | |
| Hover explanations | | |
| Product knowledge | | |
| Scene guidance | | |
| UX load | | |
| Accessibility | | |
| i18n | | |
| Engineering | | |

## Architecture (brief)
…

## Findings (by severity)
### P0 …
### P1 …
### P2 …

## Top fixes (ranked)
1. …

## Keep as-is
- …

## Re-audit checklist
- [ ] …
```

## Rules

- Prefer **evidence over opinion**.
- Prefer **product-true** copy over marketing fluff when recommending rewrites.
- Do **not** invent features (e.g. passwords) as requirements.
- Do **not** implement fixes unless the user says to implement / go / fix.
- If the assistant is missing from the tree, say so and stop.

## Suggested commands

```bash
# From app/
npx vitest run lib/__tests__/faro-*.test.ts lib/__tests__/journey-coach-pure.test.ts --reporter=dot
```

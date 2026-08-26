---
name: audit-faro-ui-density
description: >
  Focused UI density audit of Faro Design — root rem, type scale, padding, illustrations,
  coach/chrome, Design Studio nesting, and control sizes when the product feels oversized
  or “everything is too big.” Use when the user asks for a UI density audit, compact UI,
  scale down the app, or runs /audit-faro-ui-density.
---

# Audit Faro UI Density

You are a **UI density expert** for Faro Design (`F:\Faro Design\app`). The owner’s recurring complaint: **every element feels extremely big**. Your job is a close, evidence-based audit — not a vague “make it smaller” note.

Default: **read-only**. Do not implement unless the user asks to fix / implement / go.

## Mission

Find why the product still feels oversized **after** rem tweaks (often `html { font-size: 15px }` is already set). Overwhelm usually comes from **display type leftovers, page padding, illustration mass, nested rails, hero loaders, and coach chrome** — not rem alone.

## Surfaces to inspect (priority order)

| Priority | Surface | Paths |
|----------|---------|--------|
| P0 | Global scale | `app/app/globals.css`, `app/app/brand/tokens.css`, `public/brand/tokens.json` |
| P0 | Design Studio | `components/DesignStudio.tsx`, `DesignGenerationWindow.tsx`, `ProjectSidebar.tsx` |
| P0 | Express / strategy | `components/ExpressJourney.tsx`, FaroLoader beacon sizes |
| P1 | Home / marketing bleed | `components/HomeChrome.tsx` |
| P1 | Stage headers | `StagePageBanner.tsx`, `IllustrativeFigure.tsx` |
| P1 | Working journey titles | project hub, name, logo, handover, start, settings, section/review templates |
| P1 | Living coach | `JourneyCoach.tsx`, `FaroPersona.tsx`, `ProjectMobileBar.tsx` |
| P2 | Buttons / fields | `rounded-full px-6 py-3`, input `py-3` / `text-lg`, textarea rows |
| P2 | Share / package | share pages, `FinalPackageViewer.tsx` (deliverable may stay larger) |

Also grep for leftovers:

```text
text-4xl|text-5xl|text-6xl|text-7xl|lg:text-4xl|lg:text-5xl
py-12|py-14|py-16|lg:py-12|lg:py-14|lg:py-16
lg:px-12|2xl:max-w-\[10
min-h-\[60vh\]|min-h-\[70vh\]|beaconSize=\"hero\"
w-72|grid-cols-\[320px|clamp\(
```

## What “good density” means here

- **Product pages** (hub, express, name, logo, design, handover, settings, start): tool-like — titles ≤ ~`text-2xl` / `text-3xl` max; page pad ~`px-4–5 py-5–6` (not `lg:px-12 py-12+`); primary CTAs ~`px-4–5 py-2–2.5`.
- **Marketing home** may stay slightly larger, but should not set the in-app expectation (cap ultra-wide `2xl:max-w-[110rem]`).
- **Share / final package viewer** can stay editorial; call that out separately.
- Rem ~14.5–15px is fine **only if** type/spacing/chrome contracts are also dense. Rem alone will not fix `text-5xl` or double rails.

## Audit procedure

1. Note branch + whether `html { font-size }` is 15/16/17px in served CSS if the app is up (`:3100`).
2. Walk the priority table; open or HTTP-check key routes if the server is running.
3. For each finding: **file path**, current class/value, **why it feels big**, suggested target, severity.
4. Separate **marketing** vs **product** findings.
5. Rank a **density fix recipe** (order of operations — type ceiling before rem cuts).
6. Optional: estimate “overwhelm score” 1–10 for home, express, design, mobile.

Use `references/density-checklist.md` as a pass/fail list.

## Output format (always)

```markdown
# Faro UI Density Audit
**Branch / date:** …
**Root rem:** …px
**Overall overwhelm:** N/10 (1 calm · 10 enormous)

## Executive summary
…

## Scorecard
| Surface | Overwhelm 1–10 | Notes |
|---------|----------------|-------|
| Global rem/tokens | | |
| Home | | |
| Express | | |
| Design Studio | | |
| Logo / Name | | |
| Coach + mobile chrome | | |
| Share / package | | |

## Findings
### P0 …
### P1 …
### P2 …

## Density fix recipe (ordered)
1. …

## Keep as-is
- …

## Re-audit
- [ ] Product H1s ≤ text-2xl/3xl
- [ ] No journey text-4xl/5xl leftovers
- [ ] Design pipeline ≤ ~260–280px; sidebar ≤ w-60
- [ ] Preview min-h ≤ ~40–48vh in-studio
- [ ] Coach face ≤ ~44px; no hero beacon on mid-journey waits
- [ ] Hard-refresh at 100% browser zoom still feels tool-sized
```

## Rules

- Evidence over taste. Quote class names and paths.
- Do not recommend only “set rem to 14px” without the chrome/type pass.
- Do not commit/push unless asked.
- Do not implement unless asked.
- Local pilots stay out of git.

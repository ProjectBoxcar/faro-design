# 10 — Asset Studio (phase 2: from strategy to actual brand)

**Status: integrated batch 1 — the Logo Workshop runs inside Brand App on port 3100 and stores its human-approved candidates separately from final Design Studio deliverables.**

## The pivot

Phase 1 ends at a brief for a graphic designer. Phase 2 removes the designer as the final client:
the app carries the owner from strategy all the way to **usable brand deliverables**. A designer can
still use the app and **audit** the work as it develops — but they are optional QA, not the recipient.

This works because the strategy layer already produces everything asset generation needs: the concept,
strategic brief, emotional territory, chosen visual territory, palette/typography *directions*
(`system.*` sections describe assets in words), and — critically — **scored evaluation frameworks**
that let the app judge candidates automatically instead of asking the owner to be a designer.

## Architecture facts (settled)

- **Claude generates the assets** via the configured AI provider and the same default reasoning model used by the rest of Brand App.
  Logos are **SVG written by the model** — real vector, production format. No image-gen API in v1.
- **The app owns the deliverable.** Assets are stored in the DB, rendered in-app, exported as a
  package. claude.ai/design has **no public API**; syncing there happens through Claude Code
  (DesignSync) as an optional publish step — a browsable design-system mirror, never the source of truth.
- **Owner makes taste choices only.** Generate N candidates → auto-score each against the brief via
  an `evaluations` row (existing pass/caveat/fail machinery) → discard fails → owner picks between
  vetted directions. The owner is never asked to judge design quality.

## Asset scope v1 (mirrors the Design Plan components)

| Component | Deliverable | Notes |
|---|---|---|
| Logo | Primary SVG + version system (horizontal, reduced, isotype) | Type-driven/geometric territory only in v1 — model-written SVG is genuinely good there, weak at illustrative marks |
| Color palette | tokens (hex, roles, ratios) + WCAG contrast matrix | Formalizes `system.color`; contrast computed locally, not by the model |
| Typography | Families + full type scale + usage rules | **Open-license fonts only** (Google Fonts) so the delivered brand is legally usable |
| Verbal identity | Tagline, key phrases, boilerplate copy | Same generation flow as strategy sections |
| Visual elements | SVG pattern/icon starters per `system.visual-elements` | |
| Photography | Art-direction spec (not images) | Until an image-gen API is wired in (post-v1: Recraft/Ideogram) |
| Guidelines | Generated brand-manual page assembled from accepted assets | Print-friendly, like the share page |
| Templates | Social/OG card + letterhead as HTML/SVG | Post-v1 candidate |

## Pipeline (per Design Plan row marked `create`)

1. **Generate** — Opus produces 3–5 candidates from the compiled brief (reuse `lib/brief.ts` compilation
   as prompt input; provenance recorded like `ai_generations.reads`).
2. **Auto-score** — each candidate gets an `evaluations` row (`type: "logo"` etc.), pass/caveat/fail
   per criterion: concept alignment, territory fit, legibility/scalability (logo rendered small),
   distinctiveness, versatility (light/dark). Fails are discarded automatically — no owner adjudication.
3. **Choose** — owner picks between surviving directions (taste choice), can request variations.
4. **Approve** — an explicit human act, a real button. The owner approves the refined asset;
   only then does it exist as far as the brand is concerned.

**The approval rule (load-bearing):** AI proposes, scores, and discards — it never approves.
Every asset in the Brand Package traces to an explicit human approval (`approved_at` timestamp).
Auto-scoring filters what the owner sees; it grants nothing. A second, optional signature layer —
the **designer audit** — lets a designer reviewing via the share link mark each approved asset
`audited` or flag it with a note. Audit status is visible on the package but never blocks the owner
(their brand, their call). The package export and any Claude Design sync are gated on owner
approval of every included asset; publish warns if P1 assets are unapproved or flagged.

## Data model additions

- `studio_assets`: `id, project_id, kind (logo|palette|typography|visual-element|verbal|photo-spec), label,
  payload (SVG text or JSON tokens), status (candidate|chosen|approved|discarded), approved_at,
  audit_status (null|audited|flagged), audit_note, evaluation_id, created_at`.
- Existing `evaluations` table already fits the scoring (multi-instance, subject = candidate label).

## Deliverable: the Brand Package

A new project page (and the new payoff): gallery of accepted assets + **download as ZIP** —
logo SVGs (+PNG renders), `tokens.json`, type specimens, guidelines HTML. The phase-1 share brief
remains, repositioned as the **audit surface** for an optional designer (later: per-asset flags/comments).

## Honest v1 limits (state them in the UI)

- Logo territory limited to wordmarks/geometric marks; illustrative marks need post-v1 image-gen or a human.
- Naming availability checks stay heuristic — trademark caveat carries into the package.
- Photography ships as direction, not pictures.

## Roadmap

- **A. PoC (now)** — script only, no UI: palette + type system + 3 SVG wordmark candidates from the
  Brand App project's own completed strategy, auto-scored, rendered to an HTML gallery. Go/no-go gate.
- **B. Studio** — `studio_assets` table + studio UI for logo/palette/typography with the full pipeline.
- **C. Brand Package** — package page + ZIP export.
- **D. Claude Design sync** — publish accepted system via DesignSync.
- **E. Audit mode** — designer flags on the share view.
- Merge to `main` only after B+C prove out, on explicit command.

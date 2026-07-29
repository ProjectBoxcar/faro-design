# 08 — Handover Spec (the shareable brief)

The product's payoff: a **read-only web page** the graphic designer opens (no login) that reads like
a brief they can act on immediately. URL: `/share/<token>` with an unguessable token minted on publish.

## What it contains (in order)

1. **Header** — brand/engagement name, one-line concept statement, "prepared by {designer}".
2. **Brand Concept** — statement + description. The guiding idea everything is measured against.
3. **Strategic Brief** — the 5 fields: Central Pattern · Main Tension · Constraint ·
   Emotional Territory · What the Concept Must Resolve. This is the designer's compass.
4. **Manifesto** — the brand's voice, so the graphic designer feels the tone.
5. **Design Plan** — the actionable scope:
   - Scope levels active (Definition / Identity Systems / Implementation).
   - Verbal + Visual identity tables: `{component, action (create/adjust/keep), priority}`.
   - Touchpoints by priority (P1 must exist / P2 must transform / P3 can wait).
   - Deliverables and the dependency-ordered **execution order**.
6. **Supporting strategy context** (collapsible) — Personality, Tone of Voice, Values, Purpose,
   Brand Promise, and the Identity↔Image key finding. Enough to design from without the full document.

## What it must NOT contain

- The **Viability Gate** or any designer-internal evaluation.
- Raw client interview notes, pricing/capacity, or anything in a section whose resolver is internal.
- AI drafts that haven't been accepted by the designer.
- Anything from a section still marked `empty`/`draft` (only `complete` sections render).

## Behavior

- **Snapshot on publish (current):** Each publish freezes brief + selected design package (+ implement
  pack when ready) into `publish_snapshots`. Share routes serve the **current** snapshot so later
  edits in Faro do not rewrite what the designer already received. Re-publish creates **vN+1**
  (same share token by default). See `lib/publish-snapshot.ts`.
- **Legacy:** Tokens published before snapshots existed fall back to live DB compile.
- **Copy as Markdown** per section and for the whole brief, so the designer can paste into their tools.
- **Revoke:** clearing `share_token` unpublishes the link; snapshot history is retained locally but
  no longer current.
- Clean, print-friendly typography. No app chrome, no nav, no edit affordances.

## Later (not v1)

- PDF export, asset/image embeds, per-section designer comments, Notion push.

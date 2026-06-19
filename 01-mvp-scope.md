# 01 — MVP Scope

## The one-sentence goal

Turn a brand engagement into a designer-ready **handover brief** by walking the Finisterra
methodology, with Claude drafting the synthesis sections.

## Who uses it

- **The designer (primary).** Owns every section, runs evaluations, edits AI drafts, publishes the
  handover link.
- **The client (secondary).** Via a per-project share link, can fill **intake-only** sections
  (their story, their reality). Never sees designer-internal sections (e.g. the viability gate).
- **The graphic designer (consumer).** Opens the published read-only handover link. Does not log in.

## In scope for v1

1. **Projects** — create / list / open / archive a brand engagement. Each is self-contained.
2. **Strategic phase capture** — the 4 pillars (Reality, Identity, Image, Communication) as guided
   forms with the methodology's trigger questions inline.
3. **Viability gate** — the 12-criterion Evaluation Criteria checklist with a go/no-go rule
   (failing a non-negotiable blocks/marks the project). Designer-only.
4. **AI synthesis (hybrid)** for the pure-synthesis sections:
   Strategic Brief, Strategic Document, Brand Concept, Manifesto, the Communication block
   (Purpose / Values / Personality / Tone / Promise), Identity↔Image contrast.
5. **Planning** — Brand Audit + Design Plan (priorities auto-derived from the audit).
6. **Handover link** — a published, read-only page compiling Strategic Brief + Brand Concept +
   Manifesto + Design Plan for the graphic designer. Shareable URL with an unguessable token.

## In scope but secondary (build last)

7. **Design-phase evaluation tools** — Naming (6 tests + availability checklist), Visual Territory
   (build 2–3, 4-filter eval), Logo evaluation (14 parameters, 2 levels). Used by the designer to
   assess what the graphic designer returns, and to run naming/territory themselves.

## Out of scope for v1

- Client accounts / auth / multi-tenancy / roles beyond the single share-link mechanism.
- Real-time collaboration, comments, approval workflows with notifications.
- File/asset storage and image rendering (logos, moodboards). v1 references assets by description
  and link; it does not host binaries. (Revisit — see `09-open-questions.md`.)
- Survey tooling / sending the Image survey for real. v1 captures results the designer pastes in.
- Domain/handle availability **automation** (the Naming technical check is a manual checklist in v1).
- Cloud hosting / Fly.io migration (separate later decision, like the Gut app).
- PDF export, Notion sync (handover is a web link in v1; copy-to-markdown is a nice-to-have).

## Success criteria for v1

- I can take a new client from empty project → published handover link without leaving the app.
- Every synthesis section can be AI-drafted from its real upstream inputs, then edited.
- The handover link reads like a brief a graphic designer can act on immediately.
- Nothing designer-internal leaks onto the share link.

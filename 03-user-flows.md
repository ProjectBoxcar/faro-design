# 03 — User Flows

## A. Designer: new engagement → handover

1. **Create project** (name, client, greenfield?). Lands on the project workspace.
2. **Workspace** = left nav by Phase → Pillar → Section, with per-section status dots
   (empty / draft / complete). A progress header shows phase completion.
3. **Reality** — fill input sections (or send the client a link, flow B). Run the **Viability Gate**:
   answer 12 criteria; the app computes go/no-go. A non-negotiable failure marks the project
   `blocked`/`at_risk` (designer can override with a note).
4. **Identity** — capture introspective sections.
5. **Image** — "Generate survey" (Haiku) derives questions from Identity. Designer sends it (outside
   the app), pastes **Results** back, then "Analyze patterns" and "Generate contrast" (Opus).
6. **Communication** — generate Purpose / Values / Personality / Tone / Promise from the pillars;
   edit; mark complete.
7. **Strategy close** — generate **Strategic Document** (client-facing) and **Strategic Brief**
   (internal). Review/edit.
8. **Planning** — generate **Brand Concept** from the Brief; capture/Generate **Reusable Insights**
   and **Manifesto**; run **Brand Audit** (skipped if greenfield); generate **Design Plan**.
9. **Publish handover** — review the compiled brief preview, then "Publish". Get a share URL. Copy
   and send to the graphic designer.
10. **Design phase (optional)** — as the graphic designer returns work, score it with the Logo /
    Territory / Naming evaluators.

## B. Client: intake via share link

1. Designer clicks "Invite client" on a project → generates an **intake link** (separate token/scope
   from the handover link).
2. Client opens it: sees only **client-resolver input sections** (Problem, Solution, Origin,
   Aspiration, Beliefs, etc.) as a friendly guided form with trigger questions. No designer-internal
   content, no AI, no evaluations.
3. Client saves; those sections show `client_submitted` in the designer's workspace for review.

> v1 may ship flow B as "designer fills everything" if the share-link scoping isn't ready — the
> capture forms are identical, only the entry point differs. See roadmap.

## C. Graphic designer: consume handover

1. Opens the published read-only URL (no login).
2. Reads the compiled brief: Brand Concept, Strategic Brief, Manifesto, Design Plan (scope +
   priorities + execution order), plus supporting strategy context.
3. Optionally copies sections as Markdown. Nothing is editable; nothing internal is shown.

## Section interaction model (the repeating unit)

Every section renders one of three ways based on its `kind`:

- **input** → a form built from `fields` + trigger questions inline. Save sets status.
- **synthesis** → the same form, **plus** a "Generate draft" button (enabled only when upstream
  `reads` exist). Generated text fills the fields, flagged as AI; editing clears the flag; "Accept"
  marks complete. A "Drafted from …" provenance line shows the inputs used.
- **eval** → a scored checklist/table (viability, naming, logo, territory) that computes a verdict
  and can hold multiple candidates.

# 09 — Open Questions

Decisions to revisit; none block step 1.

## Product
1. **Client intake link (flow B)** — ship in v1, or start "designer fills everything" and add the
   scoped client link later? (Leaning: defer to step 7; forms are identical.)
2. **Handover: live vs snapshot** — render live from DB (simpler) or freeze a snapshot on publish so
   edits don't change a brief already sent? (Leaning: live in v1, snapshot later.)
3. **Assets/images** — graphic designer's returns (logos, moodboards) are visual. v1 references by
   description + link. When do we add image upload/hosting? (Affects backup size.)
4. **Concept distillation** — one-shot generation in v1; upgrade to a guided 6-step chat when?

## Methodology
5. **Greenfield audit skip** — confirm: when `greenfield=true`, hide Brand Audit and source all
   Design Plan items as "create"? (Spec says yes.)
6. **Viability override** — ~~hard-block vs soft?~~ **Decided:** soft-block + override note on the
   project hub (`viability_override_note`); re-check clears the override.
7. **Tension classification** — Main Tension enum (ability / visibility / coherence) — fixed list or
   free text? (Leaning: enum with "other".)
8. **Multi-brand architecture** — how deep to model mother/product/sub-brand relationships in v1?
   (Leaning: capture as structured text, not a graph, until needed.)

## Technical
9. **Model default** — Opus 4.8 everywhere vs Opus for flagship synthesis + Sonnet for lighter drafts
   to cut latency? (Leaning: Opus default, per-section override available.)
10. **Structured output** — Zod-validate every synthesis field, or only the discrete ones
    (Brief 5 fields, Concept sub-objects) and leave prose free? (Leaning: validate discrete only.)
11. **Methodology versioning** — if `methodology.json` changes after projects exist, do old projects
    migrate? (Leaning: section keys are stable; additive changes only, like the DB rule.)

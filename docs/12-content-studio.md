# 12 — Content Studio

**Status:** Scaffold on `feature/content-studio`. Not a full product yet — structure, gates, and placeholders only.

Content Studio turns a **locked brand profile** + **raw media** into a **monthly social content calendar**. It never invents a new brand system from scratch when a FARO project is complete; it **consumes** strategy, logo, and visual system as inputs.

## Workflows

| Workflow | Entry | Brand profile source |
|----------|--------|----------------------|
| **A — Existing project** | Project stage “Content Studio” after brand package is ready | Ingest locked profile from project (strategy tone, logo, design tokens) |
| **B — No brand yet** | `/content-studio` (standalone) | Infer lightweight starter profile from uploaded footage, then lock |

Both workflows call the **same generation engine** after a `BrandProfile` is locked.

## Unlock rules (Workflow A)

Content Studio unlocks when the project’s brand package is complete:

- Approved logo  
- Selected design system + landing + deck (same as handover package ready)

See `lib/content-studio/gates.ts`.

## Architecture

```
app/ (Next.js — UI + API façade)
  lib/content-studio/     # TypeScript types, gates, store, façade
  components/content-studio/
  app/projects/[id]/content/
  app/content-studio/     # Workflow B entry
  app/api/content-studio/

services/content-studio/  # Python — modular pipeline (placeholders for model APIs)
  content_studio/
    brand_profile.py      # ingest from project JSON | infer from assets
    asset_processing.py   # upload normalize / frame extract placeholders
    generation.py         # captions, hashtags, platform crops (placeholders)
    engine.py             # shared orchestration
```

**Decoupling rule:** brand ingestion and content generation never import each other’s IO.  
`engine.generate_month(profile, assets, options)` is the only generation entry.

## Data (SQLite)

Tables (migration `0012_content_studio.sql`):

- `content_profiles` — locked brand profile (project_id nullable for B)  
- `content_raw_assets` — uploaded media metadata  
- `content_calendars` — one calendar period per profile  
- `content_posts` — day/platform items (caption, hashtags, crop variants, status)

## Owner UX

1. Open Content Studio (locked until brand package ready on project path).  
2. See read-only brand profile strip.  
3. Upload raw video/photo assets.  
4. Generate month → **calendar view** (day/week).  
5. Edit captions/hashtags, approve posts, export (export placeholder).

## AI lanes

Content generation is a **new lane candidate** (strategy / logo / design remain untouched). Scaffold uses placeholders only — wire Anthropic/OpenAI/Gemini later without mixing logo OD or strategy keys accidentally. Document final lane choice in `docs/11-ai-lanes.md` when implementing.

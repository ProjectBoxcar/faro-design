# 12 — Content Studio

**Status:** Live generation on `feature/content-studio` — Strategy AI + Open Design (not placeholders).

Content Studio turns a **locked brand profile** + **raw media** into a **monthly organic social content calendar**. It never invents a new brand system from scratch when a FARO project is complete; it **consumes** strategy, logo, and visual system as inputs.

## Generation lanes

| Step | Engine | Produces |
|------|--------|----------|
| Media intelligence (P0) | **Strategy AI vision** (same Settings strategy key) | Per-asset analysis cards: subjects, setting, mood, crop hints, honest angles, do-not-claim, brand-fit |
| Month plan (P1) | **Strategy AI** (text) | Themes, channels, captions, hashtags, dimensions, creative direction, asset assignment — **grounded in media cards** |
| Post visuals (P3) | **Open Design** (daemon + Anthropic BYOK) | HTML social designs with **multimodal vision** of the source photo/keyframe + layout template from media analysis + brand palette/logo |

Do not use OpenAI/Gemini for post graphics (same rule as Design Studio). Logo lane stays separate.

### Media-first rules

1. Every stored photo/video is **vision-analyzed** before the month plan (action `analyze-media`, or automatically inside `generate-month`).
2. Strategy prompts receive **what is SEEN**, not only filenames.
3. Captions and art direction must not invent studio process / sketches / client work the card does not support.
4. **P2 hard gate** (`enforceMediaConsistency`): inventing posts get **full caption/hook/theme/art direction replaced** with deterministic media-grounded copy. Report stored on `strategy.consistency`.
5. **P5 video**: keyframes via `FFMPEG_PATH`, system `ffmpeg`, or **`ffmpeg-static`** (bundled). Multiple frames → full vision card; missing binary → `unanalyzed` (never invent).
6. **P4 owner controls**:
   - **Month brief** — goal, offer, taboo, language, notes (sent with `generate-month`)
   - **Asset tags** — `hero` | `bts` | `product` | `lifestyle` | `event` | `no-ads`
   - **Exclude** — hard drop from plan (`owner_meta.excluded`)
   - **Drop weak-fit** — optional filter on vision `brandFit=weak` (keeps ≥1 asset)
   - **Reuse policy** — `unique-first` | `prefer-strong` | `rotate` when posts > assets
7. **P3 Open Design composition**:
   - Attach source image (or video keyframe) as Anthropic vision input through OD daemon
   - `suggestLayoutFromMedia` picks type zone, object-position, scrim strength from analysis
   - Post-pass injects layout lock CSS + hero `object-position`

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

Content Studio **reuses** existing lanes (does not invent a fourth provider path):

- **Media vision + creative/technical** → Strategy Settings key (`media-analysis.ts`, `ai-plan.ts`)
- **Designs** → `generateDesignText` / Open Design daemon (same as Design Studio)

See `lib/content-studio/media-analysis.ts`, `ai-plan.ts`, `od-designs.ts`, `generate.ts`.

### API actions

| Action | Purpose |
|--------|---------|
| `analyze-media` | Run / refresh vision cards on all stored assets |
| `update-asset-meta` | Set tags / exclude / note on one asset (P4) |
| `generate-month` | Vision → filter owner controls → strategy plan. Options: `monthBrief`, `reusePolicy`, `excludeWeakFit`, `forceReanalyze` |
| `design-post` | Open Design one post using brand + media + analysis |

Assets store `analysis` (`MediaAnalysisCard`) and `owner_meta` (`AssetOwnerMeta`) on `content_raw_assets`.

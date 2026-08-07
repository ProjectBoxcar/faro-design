# 07 — Roadmap (build order)

Status as of **2026-08-07** (aligned with `feature/content-studio` code).

## Done

### Foundations
- Design docs, Next.js app, Drizzle schema + migrations, methodology loader.
- Project list / create; `start.bat` / `start.ps1` boots app + Open Design.

### Strategic capture & Express
- Quick Start intake; Express full strategy draft pipeline; pillar deep review.
- Viability gate (auto, panel, override); lifecycle phase sync.

### AI synthesis (three lanes)
- Strategy / Logo / Design separation (`docs/11-ai-lanes.md`); Settings lane health.
- Generate → edit → accept; pure unit tests for gates, viability, publish, content storage.

### Planning & name
- Brand concept, manifesto, design plan; name workshop with confirm vs availability.

### Logo Workshop
- Generate / judge / human approve; diversity retry; SVG sanitize.

### Design Studio
- Open Design only; identity → landing → deck; job resume; package on Brand Handover.

### Handover
- Share token; **publish snapshots** (strategy brief vs package freeze); implement pack ZIP.
- Public `/share/[token]`; offline deliverable rules.

### Content Studio (live on feature branch)
- Vision media cards; month plan (2–3×/week); OD multimodal posts; owner tags/brief/export.
- Migrations 0012–0016 (analysis, owner_meta, calendar strategy, job refine_meta).

### Owner UX journey
- Six-stage journey SSOT; mobile stages; single Up next; readiness banner; UX smoke script.

## Open / next

1. Content Studio export polish (ICS / multi-format) if product needs calendars.
2. Multi-worker long-job queue (today: single Node process + boot reconcile).
3. Client intake share link (flow B) with section scoping.
4. Conversational concept distillation UX.
5. Drizzle meta snapshots after 0008 (hand-written SQL policy documented).
6. Optional Fly.io / remote deploy decision.

## Do not thrash

- Three AI lanes (no cross-engine fallbacks for logos or design).
- `buildProjectJourney` / human logo approve / publish snapshots / path containment for media.

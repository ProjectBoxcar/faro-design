---
name: faro-expert-panel
description: >
  Run a multi-expert product audit of Faro Design (stack, UI, UX, marketing,
  ops, branding, content) with an optional local-only fake brand pilot.
  Use when asked for expert panel, multi-agent audit, or /faro-expert-panel.
---

# Faro expert panel

Spawn (or role-play) seven specialists in parallel against `F:\Faro Design\app`:

| Expert | Lens |
|--------|------|
| Stack | Architecture, AI lanes, resume, security |
| UI | Tokens, chrome, a11y, image cohesion |
| UX | Six-stage journey, gates, assistant |
| Marketing | Positioning, conversion, share story |
| Ops | Cold start, OD, SQLite backup/migrate |
| Branding | Faro brand coherence + teaching quality |
| Content | Intake, Express cards, Content Studio, explain |

## Pilot rule

Fake projects are **local only** (`data/brand.db`). Never commit pilot DB data.

Suggested light pilot: create via `/api/intake` with a named brand (e.g. Harbor & Hive — coastal specialty honey), do not require full logo/design burn unless asked.

## Output format

Synthesize one owner-facing report:

1. Pilot context (name, field, local project id)
2. Cross-cutting P0 themes (agree across ≥2 experts)
3. Per-expert top findings (P0/P1/P2)
4. Recommended fix order (implementation backlog)

Prefer concrete file paths and Harbor-style user impact over generic advice.

# Faro expert agents

Reusable specialist roles for product audits. Each agent reviews the whole app through its lens, optionally alongside a **local-only** fake brand project (never commit pilot DB data).

| Agent | Focus |
|-------|--------|
| `stack` | Architecture, APIs, AI lanes, reliability, security |
| `ui` | Visual system, components, a11y, image cohesion |
| `ux` | Journey gates, cognitive load, assistant behavior |
| `marketing` | Positioning, conversion copy, share story |
| `ops` | Cold start, daemon, SQLite ops, runbooks |
| `branding` | Faro product brand coherence + teaching quality |
| `content` | Intake, coach copy, Content Studio, explanations |

## Usage

Ask Grok to run a multi-expert audit, e.g.:

> Run stack, UI, UX, marketing, ops, branding, and content experts on the app with a light local pilot.

Pilots stay on the machine (`data/brand.db`) — not in git.

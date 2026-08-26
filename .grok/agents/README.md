# Faro expert agents

Reusable specialist roles for product audits. Each agent reviews the whole app through its lens, optionally alongside a **local-only** fake brand project (never commit pilot DB data).

| Agent | Focus |
|-------|--------|
| `stack` | Architecture, APIs, AI lanes, reliability, security |
| `ui` | Visual system, components, a11y, image cohesion |
| **`ui-density`** | **Close look when everything feels oversized** — rem, type, padding, Design Studio chrome, coach, controls (skill: `/audit-faro-ui-density`) |
| `ux` | Journey gates, cognitive load, assistant behavior |
| `marketing` | Positioning, conversion copy, share story |
| `ops` | Cold start, daemon, SQLite ops, runbooks |
| `branding` | Faro product brand coherence + teaching quality |
| `content` | Intake, coach copy, Content Studio, explanations |
| `assistant` | Living Faro coach audit (`/audit-faro-assistant`) |

## Usage

Ask Grok to run a multi-expert audit, e.g.:

> Run stack, UI, UX, marketing, ops, branding, and content experts on the app with a light local pilot.

**UI still feels huge?** Run the focused density expert:

> Run /audit-faro-ui-density — everything looks extremely big

Skill path: `.grok/skills/audit-faro-ui-density/SKILL.md`

Pilots stay on the machine (`data/brand.db`) — not in git.

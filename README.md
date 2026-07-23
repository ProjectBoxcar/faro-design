# Brand App — Finisterra Methodology Workspace

A guided brand-building web app that takes a business owner from plain answers about their business to a complete brand: AI-drafted strategy, generated design systems, landing pages, decks, and logo concepts, plus a shareable read-only brief for a graphic designer.

## Status

Early build. Design docs in `docs/` (`01`–`09`) are the source of truth for scope and data model.

## Quick start

```powershell
cd "F:\Faro Design\app"
npm install
npm run db:migrate     # create the SQLite schema
npm run dev            # http://localhost:3100
```

`ANTHROPIC_API_KEY` goes in `F:\Faro Design\app\.env.local` (gitignored). Without it, capture and
evaluation work; AI-draft buttons are disabled.

## Layout

```
Brand App/
├── app/                       # Next.js product
├── docs/                      # Product design docs + intake notes
├── reference/finisterra/      # Spanish Finisterra sources (read-only)
├── external/                  # Third-party reference clones (gitignored)
├── .devin/                    # Organize agents/skills
├── README.md
└── CLAUDE.md
```

## Where the methodology lives

- Original source: `reference/finisterra/` (18 Spanish `.md` files — **read-only reference, never edited**).
- In-app, translated to English and structured as data: `app/data/methodology.json`.

## Docs

| File | What |
|---|---|
| `docs/01-mvp-scope.md` | What's in / out for v1 |
| `docs/02-methodology-model.md` | The Finisterra methodology as an English data taxonomy |
| `docs/03-user-flows.md` | How a project moves through the app |
| `docs/04-data-model.md` | Drizzle / SQLite schema |
| `docs/05-ai-architecture.md` | Synthesis prompts, model choice, hybrid AI |
| `docs/06-tech-stack.md` | Stack and why |
| `docs/07-roadmap.md` | Build order |
| `docs/08-handover-spec.md` | The shareable brief output |
| `docs/09-open-questions.md` | Decisions still pending |
| `docs/gut-intake-answers.md` | Reconstructed Gut quick-start intake answers |

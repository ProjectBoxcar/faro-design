# 06 — Tech Stack

Deliberately identical to the Gut app so the two share muscle memory, tooling, and a deployment story.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** | One codebase for UI + API routes; typed end-to-end; hot reload. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`) | Same as Gut. |
| Database | **SQLite via Drizzle ORM** (`better-sqlite3`) | Single file, zero-config, trivial backup, portable to Postgres later. |
| LLM | **Anthropic SDK** (`@anthropic-ai/sdk`) — Opus 4.8 primary, Haiku 4.5 for mechanical | Synthesis quality is the product. See `05-ai-architecture.md`. |
| Validation | **Zod** | Structured AI output + form validation. |
| Icons / motion | **lucide-react**, **motion** | Same as Gut. |
| Hosting | **localhost** (`npm run dev`) | Self-host; Fly.io is a separate later decision. |

Versions pinned to match Gut's `package.json` (Next 16.2.6, React 19.2.4, drizzle-orm 0.45.x,
better-sqlite3 12.x, @anthropic-ai/sdk 0.97.x, tailwindcss v4, tsx for scripts).

## Project structure

```
F:\Brand App\
├── 01..09-*.md, README.md, CLAUDE.md   # design docs (this folder)
├── Finisterra_md_files\                # Spanish source — read-only reference
└── app\                                # Next.js app
    ├── app\
    │   ├── page.tsx                      # project list / dashboard
    │   ├── projects\[id]\               # project workspace
    │   │   ├── page.tsx                  # overview + phase nav
    │   │   └── [section]\page.tsx        # a single section (form / synthesis / eval)
    │   ├── share\[token]\page.tsx        # public read-only handover
    │   ├── intake\[token]\page.tsx       # client intake (flow B)
    │   └── api\
    │       ├── projects\route.ts
    │       ├── sections\route.ts         # save section value
    │       ├── generate\route.ts         # POST: AI-draft a synthesis section
    │       ├── evaluate\route.ts         # save an evaluation
    │       └── publish\route.ts          # mint/refresh a share token
    ├── components\                       # SectionForm, SynthesisPanel, EvalTable, PhaseNav, ...
    ├── lib\
    │   ├── db\ (index.ts, schema.ts, types.ts)
    │   ├── anthropic.ts                  # SDK wrapper + MODELS
    │   ├── methodology.ts                # loads + types methodology.json; dependency helpers
    │   ├── prompts\                      # one module per synthesis section
    │   └── queries.ts                    # typed data access
    ├── data\
    │   ├── methodology.json              # the taxonomy (gitignored? NO — versioned with code)
    │   └── brand.db                      # SQLite (gitignored)
    ├── drizzle\                          # migrations
    ├── scripts\ (migrate.ts, backup-db.ps1)
    └── package.json
```

`methodology.json` is **versioned with code** (it's structure, not user data). `data/brand.db` and
`.env.local` are **gitignored**.

## Running

```powershell
cd "F:\Brand App\app"
npm install
npm run db:migrate
npm run dev          # http://localhost:3100
```

`.env.local`: `ANTHROPIC_API_KEY=...` (and optional `DATABASE_PATH`).

## Backups

- `data\brand.db` is the whole dataset — copy the file. `scripts\backup-db.ps1` writes a timestamped
  copy; OneDrive/Syncthing can mirror it. (Match the Gut app's backup discipline.)

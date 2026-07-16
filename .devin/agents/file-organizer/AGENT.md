---
name: file-organizer
description: Reorganizes Brand App project files for production/dev hygiene without touching irreplaceable data
allowed-tools:
  - read
  - glob
  - edit
  - exec
permissions:
  allow:
    - Write(docs/**)
    - Write(design/**)
    - Write(reference/**)
    - Write(external/**)
    - Write(scripts/**)
    - Write(.devin/**)
    - Write(app/components/**)
    - Write(app/lib/**)
    - Exec(git)
    - Exec(npm run lint)
    - Exec(npm run test)
    - Exec(npm run build)
  deny:
    - Write(app/data/**)
    - Write(**/*.db)
    - Write(**/*.db-journal)
    - Write(**/*.db-wal)
    - Write(**/*.db-shm)
    - Write(reference/finisterra/**)
  ask:
    - Write(.gitignore)
    - Write(README.md)
    - Write(CLAUDE.md)
---

You reorganize the Brand App (Finisterra methodology workspace).

## Directory convention

```
Brand App/
├── app/                     # Next.js app (source of truth for product)
│   ├── app/                 # App Router routes
│   ├── components/          # React components
│   ├── lib/                 # Domain libraries
│   ├── scripts/             # App scripts (migrate, backup)
│   ├── data/                # methodology JSON + brand.db (NEVER move/commit db)
│   └── drizzle/             # Migrations
├── docs/                    # Product design docs (01–09 + notes)
├── reference/finisterra/    # Spanish Finisterra sources (read-only)
├── external/                # Downloaded reference projects (gitignored)
├── .devin/                  # Devin agents/skills
├── README.md
└── CLAUDE.md
```

## Hard rules

1. Never touch `app/data/*.db` or backups.
2. Never edit/delete Spanish files under `reference/finisterra/` (read-only reference).
3. Prefer root-level organization first; only regroup app code when imports stay coherent.
4. Prefer `git mv` / filesystem moves that preserve content; update path references in README/CLAUDE.
5. Do not commit `external/` (large third-party trees).
6. After app code moves: run `cd app && npm run lint` and `npm run test`.

## Process

1. Map root clutter.
2. Create missing dirs.
3. Move design docs → `docs/`.
4. Move Finisterra sources → `reference/finisterra/` (content unchanged).
5. Move open-design / other third-party trees → `external/`.
6. Update docs paths; ignore external in `.gitignore`.
7. Report tree + anything left unmoved and why.

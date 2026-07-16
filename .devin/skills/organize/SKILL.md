---
name: organize
description: Unclutter Brand App folder using the file-organizer convention
agent: file-organizer
triggers:
  - user
---

Unclutter Brand App:

1. Put design docs (01–09, intake notes) in `docs/`
2. Put Spanish Finisterra sources in `reference/finisterra/` (read-only; never rewrite content)
3. Put Open Design / other third-party clones in `external/` and gitignore them
4. Keep `app/` as the product; never touch `app/data/*.db`
5. Update README.md and CLAUDE.md path references
6. Optionally create root convenience shortcuts only if needed
7. Report final tree

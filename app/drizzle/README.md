# Drizzle migrations (Faro)

## Policy

- **Hand-written SQL** lives in `drizzle/00xx_*.sql`.
- **Journal** `meta/_journal.json` is the ordered list of tags.
- **Snapshots** under `meta/` may lag (especially after 0008). Do not rely solely on `drizzle-kit generate` for this repo.
- **Runtime ensure**: some columns are also added defensively in store/design-jobs if missing (local heal).

## Apply

```bash
cd app
npm run db:migrate
```

`scripts/migrate.ts` walks the journal, applies each file, and **ignores** SQLite “duplicate column / already exists” so hand-healed DBs still converge.

## Adding a migration

1. Add `drizzle/00NN_name.sql`
2. Append an entry to `meta/_journal.json` with the next `idx` and matching `tag`
3. Update `lib/db/schema.ts`
4. Run `npm run db:migrate` on a clean and a dirty DB

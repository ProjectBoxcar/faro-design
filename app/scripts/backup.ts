import Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

// Point-in-time snapshot of the brand database. Uses SQLite's online backup API
// (via better-sqlite3) so it's consistent even while the dev server is writing.
// Run with `npm run backup`. Keeps the most recent KEEP snapshots.

const DB_PATH = join("data", "brand.db");
const BACKUP_DIR = join("data", "backups");
const KEEP = 14;

async function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`No database at ${DB_PATH} — nothing to back up.`);
    process.exit(1);
  }
  mkdirSync(BACKUP_DIR, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dest = join(BACKUP_DIR, `brand-${stamp}.db`);

  const db = new Database(DB_PATH, { readonly: true });
  await db.backup(dest);
  db.close();
  console.log(`Backed up → ${dest}`);

  // Prune to the most recent KEEP snapshots.
  const snaps = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("brand-") && f.endsWith(".db"))
    .map((f) => ({ f, t: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const old of snaps.slice(KEEP)) {
    unlinkSync(join(BACKUP_DIR, old.f));
    console.log(`Pruned old backup: ${old.f}`);
  }
}

main().catch((e) => {
  console.error("Backup failed:", e);
  process.exit(1);
});

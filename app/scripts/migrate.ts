/**
 * Apply Drizzle SQL migrations, tolerating "duplicate column" on hand-healed DBs
 * (e.g. strategy/analysis columns added via ensure* before journal was fixed).
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "brand.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const migrationsFolder = path.join(process.cwd(), "drizzle");
const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
  entries: { idx: number; tag: string }[];
};

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash text NOT NULL,
    created_at numeric
  );
`);

const applied = new Set(
  sqlite.prepare("SELECT hash FROM __drizzle_migrations").all().map((r) => (r as { hash: string }).hash)
);

function hashMigration(sql: string): string {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

function isIgnorable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /duplicate column|already exists|UNIQUE constraint failed/i.test(msg);
}

console.log(`[migrate] applying migrations to ${dbPath}`);

for (const entry of journal.entries) {
  const file = path.join(migrationsFolder, `${entry.tag}.sql`);
  if (!fs.existsSync(file)) {
    console.warn(`[migrate] missing file for ${entry.tag}, skip`);
    continue;
  }
  const sqlText = fs.readFileSync(file, "utf8");
  const hash = hashMigration(sqlText);
  if (applied.has(hash)) {
    console.log(`[migrate] skip ${entry.tag} (already applied)`);
    continue;
  }

  // Split on drizzle breakpoints
  const statements = sqlText
    .split(/-->\s*statement-breakpoint/i)
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const run = sqlite.transaction(() => {
      for (const stmt of statements) {
        try {
          sqlite.exec(stmt);
        } catch (e) {
          if (isIgnorable(e)) {
            console.warn(`[migrate] ${entry.tag}: ignored (${(e as Error).message})`);
          } else {
            throw e;
          }
        }
      }
      sqlite
        .prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)")
        .run(hash, Date.now());
    });
    run();
    console.log(`[migrate] applied ${entry.tag}`);
    applied.add(hash);
  } catch (e) {
    console.error(`[migrate] failed on ${entry.tag}:`, e);
    sqlite.close();
    process.exit(1);
  }
}

console.log("[migrate] done");
// keep drizzle import so tooling that expects it still works if re-exported later
void drizzle;
sqlite.close();

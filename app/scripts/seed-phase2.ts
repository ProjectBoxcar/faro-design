import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Seed (or re-seed) the phase-2 sandbox database from the real one.
// Uses SQLite's online backup API so it's safe even while a server holds
// brand.db open. Overwrites brand-phase2.db — the sandbox is disposable.

const SOURCE = join("data", "brand.db");
const SANDBOX = join("data", "brand-phase2.db");

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`No database at ${SOURCE} — nothing to seed from.`);
    process.exit(1);
  }
  const db = new Database(SOURCE, { readonly: true });
  await db.backup(SANDBOX);
  db.close();
  console.log(`Seeded sandbox: ${SOURCE} → ${SANDBOX}`);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

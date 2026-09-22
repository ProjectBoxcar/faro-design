import Database from "better-sqlite3";
import { cpSync, existsSync, rmSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

// Restore one snapshot into data/brand.db, and content-studio media when a
// matching folder was saved with that same stamp.
// Run with `npm run backup:restore -- brand-<stamp>.db`.
// Argument must be a basename inside data/backups — never a path.

const DB_PATH = join("data", "brand.db");
const MEDIA_DIR = join("data", "content-studio");
const BACKUP_DIR = join("data", "backups");

function refuse(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const arg = args[0];
  if (args.length !== 1 || arg == null) {
    refuse("Usage: npm run backup:restore -- brand-<stamp>.db");
  }
  if (arg.includes("/") || arg.includes("\\") || basename(arg) !== arg) {
    refuse("Refusing a path. Pass only the basename of a brand-*.db file inside data/backups.");
  }
  if (!/^brand-.+\.db$/.test(arg)) {
    refuse("Refusing argument. Expected the basename of a brand-*.db file inside data/backups.");
  }

  const srcPath = resolve(BACKUP_DIR, arg);
  const rel = relative(resolve(BACKUP_DIR), srcPath);
  if (rel !== arg || rel.startsWith("..")) {
    refuse("Refusing a path. Pass only the basename of a brand-*.db file inside data/backups.");
  }
  if (!existsSync(srcPath) || !statSync(srcPath).isFile()) {
    refuse(`No such backup file: ${join(BACKUP_DIR, arg)}`);
  }

  console.log(
    "Stop the server before restoring. A running server can lock data/brand.db or write over the restored data.",
  );

  const stamp = arg.slice("brand-".length, -".db".length);
  const db = new Database(srcPath, { readonly: true, fileMustExist: true });
  await db.backup(DB_PATH);
  db.close();
  console.log(`Restored database → ${DB_PATH}`);

  const mediaSrc = join(BACKUP_DIR, `content-studio-${stamp}`);
  if (existsSync(mediaSrc) && statSync(mediaSrc).isDirectory()) {
    rmSync(MEDIA_DIR, { recursive: true, force: true });
    cpSync(mediaSrc, MEDIA_DIR, { recursive: true });
    console.log(`Restored media → ${MEDIA_DIR}`);
  }
}

main().catch((e) => {
  console.error("Restore failed:", e);
  process.exit(1);
});

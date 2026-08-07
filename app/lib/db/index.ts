import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "brand.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };

/** One-time boot reconcile for interrupted long-running work (safe if tables missing). */
let _reconciled = false;
export function ensureRuntimeReconcile(): void {
  if (_reconciled) return;
  _reconciled = true;
  try {
    // Lazy import to avoid circular deps at module load
    void import("@/lib/design-jobs").then((m) => {
      try {
        m.reconcileOrphanDesignJobs();
      } catch (e) {
        console.warn("[boot] design job reconcile failed:", e);
      }
    });
    void import("@/lib/express").then((m) => {
      try {
        m.reconcileOrphanExpressRuns();
      } catch (e) {
        console.warn("[boot] express reconcile failed:", e);
      }
    });
  } catch {
    /* ignore */
  }
}

// Fire on first import of db (every server process).
ensureRuntimeReconcile();

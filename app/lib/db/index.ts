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
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });
export { schema };

/** One-time boot reconcile for interrupted long-running work (safe if tables missing). */
let _reconciled = false;
export function ensureRuntimeReconcile(): void {
  if (_reconciled) return;
  _reconciled = true;
  // Deferred to next tick so design-jobs/express can finish loading db first (avoid cycles).
  setImmediate(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const designJobs = require("@/lib/design-jobs") as typeof import("@/lib/design-jobs");
      designJobs.reconcileOrphanDesignJobs();
    } catch (e) {
      console.warn("[boot] design job reconcile failed:", e);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const express = require("@/lib/express") as typeof import("@/lib/express");
      express.reconcileOrphanExpressRuns();
    } catch (e) {
      console.warn("[boot] express reconcile failed:", e);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const logoJobs = require("@/lib/logo-jobs") as typeof import("@/lib/logo-jobs");
      logoJobs.reconcileOrphanLogoJobs();
    } catch (e) {
      console.warn("[boot] logo job reconcile failed:", e);
    }
  });
}

// Fire on first import of db (every server process).
ensureRuntimeReconcile();

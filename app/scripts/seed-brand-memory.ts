import {
  recordPackageLearning,
  recordStrategyLearning,
  brandMemoryStats,
} from "../lib/brand-memory";
import { db } from "../lib/db";
import { projects } from "../lib/db/schema";
import { isNotNull, or, eq } from "drizzle-orm";

const rows = db
  .select()
  .from(projects)
  .where(or(isNotNull(projects.share_token), eq(projects.current_phase, "finished")))
  .all();

console.log(`Seeding memory from ${rows.length} published/finished project(s)…`);
for (const p of rows) {
  try {
    recordStrategyLearning(p.id);
    recordPackageLearning(p.id);
    console.log("  +", p.name);
  } catch (e) {
    console.warn("  !", p.name, e);
  }
}
console.log("stats", brandMemoryStats());

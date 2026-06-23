import "server-only";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// The single settings row (id = 1). Created on first access.
function getSettingsRow() {
  let row = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!row) {
    db.insert(settings).values({ id: 1 }).run();
    row = db.select().from(settings).where(eq(settings.id, 1)).get();
  }
  return row!;
}

// Resolve the active Anthropic key: the one saved in Settings wins, then the
// ANTHROPIC_API_KEY env var. Returns null if neither is set.
export function getApiKey(): string | null {
  const dbKey = (getSettingsRow().anthropic_api_key ?? "").trim();
  if (dbKey) return dbKey;
  const envKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  return envKey || null;
}

export function setApiKey(key: string | null): void {
  getSettingsRow();
  const clean = key && key.trim() ? key.trim() : null;
  db.update(settings).set({ anthropic_api_key: clean }).where(eq(settings.id, 1)).run();
}

// Status for the Settings UI — never returns the key itself.
export function apiKeyStatus(): { configured: boolean; source: "settings" | "env" | null } {
  const fromDb = Boolean((getSettingsRow().anthropic_api_key ?? "").trim());
  if (fromDb) return { configured: true, source: "settings" };
  const fromEnv = Boolean((process.env.ANTHROPIC_API_KEY ?? "").trim());
  return { configured: fromEnv, source: fromEnv ? "env" : null };
}

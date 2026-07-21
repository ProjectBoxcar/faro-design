import "server-only";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { AiProvider } from "@/lib/db/types";

// The single settings row (id = 1). Created on first access.
function getSettingsRow() {
  let row = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!row) {
    db.insert(settings).values({ id: 1 }).run();
    row = db.select().from(settings).where(eq(settings.id, 1)).get();
  }
  return row!;
}

// Resolve the active API key: the one saved in Settings wins, then the provider-
// appropriate env var (ANTHROPIC_API_KEY for Anthropic, OPENAI_API_KEY for OpenAI-
// compatible). Returns null if neither is set.
export function getApiKey(): string | null {
  const dbKey = (getSettingsRow().anthropic_api_key ?? "").trim();
  if (dbKey) return dbKey;
  const provider = getProvider();
  const envKey =
    provider === "anthropic"
      ? (process.env.ANTHROPIC_API_KEY ?? "").trim()
      : (process.env.OPENAI_API_KEY ?? "").trim();
  return envKey || (process.env.ANTHROPIC_API_KEY ?? "").trim() || null;
}

export function setApiKey(key: string | null): void {
  getSettingsRow();
  const clean = key && key.trim() ? key.trim() : null;
  db.update(settings).set({ anthropic_api_key: clean }).where(eq(settings.id, 1)).run();
}

export function getProvider(): AiProvider {
  return getSettingsRow().ai_provider;
}

export function getBaseUrl(): string | null {
  return (getSettingsRow().ai_base_url ?? "").trim() || process.env.OPENAI_BASE_URL?.trim() || null;
}

export function setBaseUrl(url: string | null): void {
  getSettingsRow();
  const clean = url && url.trim() ? url.trim() : null;
  db.update(settings).set({ ai_base_url: clean }).where(eq(settings.id, 1)).run();
}

export function getAiModel(): string | null {
  return (getSettingsRow().ai_model ?? "").trim() || null;
}

export function setAiModel(model: string | null): void {
  getSettingsRow();
  const clean = model && model.trim() ? model.trim() : null;
  db.update(settings).set({ ai_model: clean }).where(eq(settings.id, 1)).run();
}

export function setProvider(provider: AiProvider): void {
  getSettingsRow();
  db.update(settings).set({ ai_provider: provider }).where(eq(settings.id, 1)).run();
}

// The synthesis model: the Settings row decides, falling back to the schema
// default (Opus). Lets the model be swapped without a code change.
export function getDefaultModel(): string {
  return getSettingsRow().default_model;
}

// Status for the Settings UI — never returns the key itself.
export function apiKeyStatus(): { configured: boolean; source: "settings" | "env" | null } {
  const fromDb = Boolean((getSettingsRow().anthropic_api_key ?? "").trim());
  if (fromDb) return { configured: true, source: "settings" };
  const provider = getProvider();
  const fromEnv = Boolean(
    provider === "anthropic"
      ? (process.env.ANTHROPIC_API_KEY ?? "").trim()
      : (process.env.OPENAI_API_KEY ?? "").trim() || (process.env.ANTHROPIC_API_KEY ?? "").trim()
  );
  return { configured: fromEnv, source: fromEnv ? "env" : null };
}

// Full provider configuration for the AI module.
export function getProviderConfig(): {
  provider: AiProvider;
  apiKey: string | null;
  baseUrl: string | null;
  model: string;
} {
  const row = getSettingsRow();
  return {
    provider: row.ai_provider,
    apiKey: getApiKey(),
    baseUrl: (row.ai_base_url ?? "").trim() || null,
    model: (row.ai_model ?? "").trim() || row.default_model,
  };
}

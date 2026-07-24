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

// ── Strategy lane (text: intake, synthesis, viability, naming) ──────────────

// Resolve the strategy API key: Settings wins, then provider-appropriate env.
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

export function getDefaultModel(): string {
  return getSettingsRow().default_model;
}

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

// ── Open Design / graphics lane (logos, systems, landing, decks) ────────────
// Prefers a dedicated design key; falls back to the strategy Anthropic key so
// Logo Workshop + Design Studio work with the key already saved in Settings.
// When falling back, provider is forced to Anthropic (the key type we have).

export function getDesignApiKey(): string | null {
  const dedicated =
    (getSettingsRow().design_api_key ?? "").trim() ||
    (process.env.OPEN_DESIGN_API_KEY ?? "").trim();
  if (dedicated) return dedicated;
  // Use the same Anthropic key strategy uses (Settings DB or env).
  return getApiKey();
}

export function setDesignApiKey(key: string | null): void {
  getSettingsRow();
  const clean = key && key.trim() ? key.trim() : null;
  db.update(settings).set({ design_api_key: clean }).where(eq(settings.id, 1)).run();
}

export function getDesignProvider(): AiProvider {
  const env = process.env.OPEN_DESIGN_PROVIDER?.trim();
  if (env === "anthropic" || env === "openai-compatible") return env;
  // If only a dedicated design key is configured, honor design_ai_provider.
  const dedicated =
    (getSettingsRow().design_api_key ?? "").trim() ||
    (process.env.OPEN_DESIGN_API_KEY ?? "").trim();
  if (dedicated) {
    return getSettingsRow().design_ai_provider ?? "openai-compatible";
  }
  // Falling back to strategy Anthropic key → always Anthropic.
  if (getApiKey()) return "anthropic";
  return getSettingsRow().design_ai_provider ?? "anthropic";
}

export function setDesignProvider(provider: AiProvider): void {
  getSettingsRow();
  db.update(settings).set({ design_ai_provider: provider }).where(eq(settings.id, 1)).run();
}

export function getDesignBaseUrl(): string | null {
  const fromDb = (getSettingsRow().design_ai_base_url ?? "").trim();
  if (fromDb) return fromDb;
  return (
    process.env.OPEN_DESIGN_BASE_URL?.trim() ||
    process.env.OPEN_DESIGN_API_BASE?.trim() ||
    null
  );
}

export function setDesignBaseUrl(url: string | null): void {
  getSettingsRow();
  const clean = url && url.trim() ? url.trim() : null;
  db.update(settings).set({ design_ai_base_url: clean }).where(eq(settings.id, 1)).run();
}

export function getDesignModel(): string {
  const fromDb = (getSettingsRow().design_ai_model ?? "").trim();
  if (fromDb) return fromDb;
  const fromEnv = process.env.OPEN_DESIGN_MODEL?.trim();
  if (fromEnv) return fromEnv;
  // Same default synthesis model as strategy when using Anthropic.
  return getDefaultModel() || "claude-opus-4-8";
}

export function setDesignModel(model: string | null): void {
  getSettingsRow();
  const clean = model && model.trim() ? model.trim() : null;
  db.update(settings).set({ design_ai_model: clean }).where(eq(settings.id, 1)).run();
}

export function designApiKeyStatus(): {
  configured: boolean;
  source: "settings" | "env" | "strategy" | null;
} {
  if ((getSettingsRow().design_api_key ?? "").trim()) return { configured: true, source: "settings" };
  if ((process.env.OPEN_DESIGN_API_KEY ?? "").trim()) return { configured: true, source: "env" };
  // Sharing the strategy Anthropic key for graphics / Open Design work.
  const strategy = apiKeyStatus();
  if (strategy.configured) return { configured: true, source: "strategy" };
  return { configured: false, source: null };
}

// Graphics config: dedicated Open Design credentials, else Anthropic strategy key.
export function getOpenDesignConfig(): {
  provider: AiProvider;
  apiKey: string | null;
  baseUrl: string | null;
  model: string;
} {
  return {
    provider: getDesignProvider(),
    apiKey: getDesignApiKey(),
    baseUrl: getDesignBaseUrl(),
    model: getDesignModel(),
  };
}

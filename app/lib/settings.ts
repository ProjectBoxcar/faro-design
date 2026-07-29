import "server-only";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { AiProvider } from "@/lib/db/types";
import { summarizeLaneHealth } from "@/lib/ai-lanes";

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

// ── Graphics keys ───────────────────────────────────────────────────────────
// Two distinct consumers:
//   • Logo Workshop  → OpenAI (Settings design key / OPENAI_API_KEY) → Gemini fallback
//   • Design Studio  → Open Design daemon ONLY (Anthropic BYOK) — never OpenAI/Gemini
//
// design_api_key in Settings is the "graphics" field: OpenAI keys power logos;
// Anthropic keys (or strategy Anthropic) power the OD daemon for identity/mockups.

export function getDesignApiKey(): string | null {
  const dedicated =
    (getSettingsRow().design_api_key ?? "").trim() ||
    (process.env.OPEN_DESIGN_API_KEY ?? "").trim() ||
    (process.env.OPENAI_API_KEY ?? "").trim();
  if (dedicated) return dedicated;
  // Anthropic OD path only: reuse strategy Anthropic key when no dedicated graphics key.
  if (getDesignProvider() === "anthropic") return getApiKey();
  return null;
}

/**
 * Anthropic BYOK for the Open Design daemon (identity systems + mockups ONLY).
 * Never returns a plain OpenAI sk-proj key.
 */
export function getOpenDesignDaemonKey(): string | null {
  const envOd = (process.env.OPEN_DESIGN_API_KEY ?? "").trim();
  if (envOd) return envOd;

  const row = getSettingsRow();
  const designKey = (row.design_api_key ?? "").trim();
  // Explicit Anthropic graphics provider + key
  if (row.design_ai_provider === "anthropic" && designKey) return designKey;
  // Anthropic-shaped key stored as graphics key
  if (designKey.startsWith("sk-ant")) return designKey;

  // Strategy Anthropic key (common setup: one Claude key for strategy + OD)
  if (getProvider() === "anthropic") {
    const strategy = getApiKey();
    if (strategy) return strategy;
  }
  const strategyKey =
    (row.anthropic_api_key ?? "").trim() || (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (strategyKey.startsWith("sk-ant")) return strategyKey;
  return null;
}

/** OpenAI (or compatible) config for Logo Workshop only. */
export function getLogoApiConfig(): {
  apiKey: string | null;
  baseUrl: string | null;
  model: string;
} {
  const row = getSettingsRow();
  const designKey = (row.design_api_key ?? "").trim();
  const openaiEnv = (process.env.OPENAI_API_KEY ?? "").trim();

  // Prefer non-Anthropic graphics key (sk-proj / sk-…)
  let apiKey: string | null = null;
  if (designKey && !designKey.startsWith("sk-ant")) apiKey = designKey;
  else if (openaiEnv) apiKey = openaiEnv;
  else if (row.design_ai_provider === "openai-compatible" && designKey) apiKey = designKey;

  const modelFromDb = (row.design_ai_model ?? "").trim();
  const model =
    modelFromDb && !/^claude/i.test(modelFromDb)
      ? modelFromDb
      : (process.env.OPEN_DESIGN_MODEL ?? "").trim() || "gpt-4o";

  const baseUrl =
    row.design_ai_provider === "openai-compatible"
      ? getDesignBaseUrl()
      : (process.env.OPENAI_BASE_URL ?? "").trim() || null;

  return { apiKey, baseUrl, model: model || "gpt-4o" };
}

export function setDesignApiKey(key: string | null): void {
  getSettingsRow();
  const clean = key && key.trim() ? key.trim() : null;
  db.update(settings).set({ design_api_key: clean }).where(eq(settings.id, 1)).run();
}

export function getDesignProvider(): AiProvider {
  const env = process.env.OPEN_DESIGN_PROVIDER?.trim();
  if (env === "anthropic" || env === "openai-compatible") return env;
  const row = getSettingsRow();
  // Explicit setting always wins when a graphics key exists (or was configured).
  if (row.design_ai_provider === "anthropic" || row.design_ai_provider === "openai-compatible") {
    const dedicated =
      (row.design_api_key ?? "").trim() ||
      (process.env.OPEN_DESIGN_API_KEY ?? "").trim() ||
      (process.env.OPENAI_API_KEY ?? "").trim();
    if (dedicated || row.design_ai_provider === "openai-compatible") {
      return row.design_ai_provider;
    }
  }
  const dedicated =
    (row.design_api_key ?? "").trim() ||
    (process.env.OPEN_DESIGN_API_KEY ?? "").trim() ||
    (process.env.OPENAI_API_KEY ?? "").trim();
  if (dedicated) {
    // sk-proj / sk- keys without "anthropic" default to OpenAI-compatible.
    const key = dedicated;
    if (key.startsWith("sk-ant")) return "anthropic";
    return row.design_ai_provider ?? "openai-compatible";
  }
  // Falling back to strategy Anthropic key → Anthropic + OD.
  if (getApiKey()) return "anthropic";
  return row.design_ai_provider ?? "openai-compatible";
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
  if (getDesignProvider() === "openai-compatible") return "gpt-4o";
  // Same default synthesis model as strategy when using Anthropic / OD.
  return getDefaultModel() || "claude-opus-4-8";
}

export function setDesignModel(model: string | null): void {
  getSettingsRow();
  const clean = model && model.trim() ? model.trim() : null;
  db.update(settings).set({ design_ai_model: clean }).where(eq(settings.id, 1)).run();
}

/** Logo Workshop key present (OpenAI graphics key). */
export function logoApiKeyStatus(): {
  configured: boolean;
  source: "settings" | "env" | null;
} {
  const row = getSettingsRow();
  const designKey = (row.design_api_key ?? "").trim();
  if (designKey && !designKey.startsWith("sk-ant")) return { configured: true, source: "settings" };
  if ((process.env.OPENAI_API_KEY ?? "").trim()) return { configured: true, source: "env" };
  return { configured: false, source: null };
}

/**
 * Open Design daemon readiness for Design Studio (identity + mockups).
 * Configured when an Anthropic BYOK key is available — not OpenAI logo keys.
 */
export function designApiKeyStatus(): {
  configured: boolean;
  source: "settings" | "env" | "strategy" | null;
} {
  if ((process.env.OPEN_DESIGN_API_KEY ?? "").trim()) return { configured: true, source: "env" };
  const row = getSettingsRow();
  const designKey = (row.design_api_key ?? "").trim();
  if (row.design_ai_provider === "anthropic" && designKey) {
    return { configured: true, source: "settings" };
  }
  if (designKey.startsWith("sk-ant")) return { configured: true, source: "settings" };
  if (getProvider() === "anthropic" && apiKeyStatus().configured) {
    return { configured: true, source: "strategy" };
  }
  const strategyKey =
    (row.anthropic_api_key ?? "").trim() || (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (strategyKey.startsWith("sk-ant")) return { configured: true, source: "strategy" };
  return { configured: false, source: null };
}

/** @deprecated Prefer getOpenDesignDaemonKey / getLogoApiConfig. Kept for Settings UI. */
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

/** OD daemon config for identity systems + mockups. */
export function getOpenDesignDaemonConfig(): {
  apiKey: string | null;
  model: string;
} {
  const fromDb = (getSettingsRow().design_ai_model ?? "").trim();
  const model =
    fromDb && /^claude/i.test(fromDb)
      ? fromDb
      : (process.env.OPEN_DESIGN_MODEL ?? "").trim() ||
        (getProvider() === "anthropic" ? getDefaultModel() : "claude-opus-4-8") ||
        "claude-opus-4-8";
  return {
    apiKey: getOpenDesignDaemonKey(),
    model,
  };
}

/**
 * Gemini fallback for Logo Workshop when the primary graphics key (OpenAI) fails
 * (quota, billing, 429). Key from env only — never commit.
 * GEMINI_API_KEY or GOOGLE_API_KEY; model: GEMINI_MODEL (default gemini-2.0-flash).
 */
export function getGeminiConfig(): {
  apiKey: string | null;
  model: string;
  /** OpenAI-compatible base for Gemini */
  baseUrl: string;
} {
  const apiKey =
    (process.env.GEMINI_API_KEY ?? "").trim() ||
    (process.env.GOOGLE_API_KEY ?? "").trim() ||
    (process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "").trim() ||
    null;
  return {
    apiKey,
    // flash-lite-latest is reliable on free tier and returns clean JSON for logos.
    model: (process.env.GEMINI_MODEL ?? "").trim() || "gemini-flash-lite-latest",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  };
}

export function hasGeminiKey(): boolean {
  return Boolean(getGeminiConfig().apiKey);
}

/**
 * AI setup snapshot for Settings / API (three engines; no secret values).
 * @see docs/11-ai-lanes.md
 */
export function getAiLaneHealthSnapshot(openDesignDaemonUp: boolean | null = null) {
  const strategyCfg = getProviderConfig();
  const strategyStatus = apiKeyStatus();
  const logoCfg = getLogoApiConfig();
  const logoStatus = logoApiKeyStatus();
  const designStatus = designApiKeyStatus();
  const od = getOpenDesignDaemonConfig();

  const lanes = summarizeLaneHealth({
    strategyConfigured: strategyStatus.configured,
    strategyProvider: strategyCfg.provider,
    strategyModel: strategyCfg.model,
    logoOpenAiConfigured: logoStatus.configured,
    geminiConfigured: hasGeminiKey(),
    logoModel: logoCfg.model,
    designAnthropicConfigured: designStatus.configured,
    designKeySource: designStatus.source,
    designModel: od.model,
    openDesignDaemonUp,
  });

  return {
    lanes,
    strategy: {
      ...strategyStatus,
      provider: strategyCfg.provider,
      baseUrl: strategyCfg.baseUrl,
      model: strategyCfg.model,
    },
    logo: {
      ...logoStatus,
      model: logoCfg.model,
      baseUrl: logoCfg.baseUrl,
      geminiConfigured: hasGeminiKey(),
      geminiModel: hasGeminiKey() ? getGeminiConfig().model : null,
    },
    designStudio: {
      ...designStatus,
      model: od.model,
      daemonUp: openDesignDaemonUp,
    },
    // Back-compat aliases used by older SettingsForm consumers
    openDesign: {
      ...designStatus,
      provider: getDesignProvider(),
      baseUrl: getDesignBaseUrl(),
      model: getDesignModel(),
    },
  };
}

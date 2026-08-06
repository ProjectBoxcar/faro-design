import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  getProviderConfig,
  getOpenDesignDaemonConfig,
  getLogoApiConfig,
  getGeminiConfig,
  hasGeminiKey,
  logoApiKeyStatus,
} from "@/lib/settings";
import { generateViaOpenDesign, isOpenDesignDaemonUp } from "@/lib/open-design-engine";
import { assertEngineForLane, type AiEngineId } from "@/lib/ai-lanes";
import type { AiProvider } from "@/lib/db/types";

/**
 * Three engines — do not merge. See docs/11-ai-lanes.md
 * - strategy → generateStrategyText (Anthropic / strategy Settings)
 * - logo     → generateLogoText (OpenAI → Gemini)
 * - design   → generateDesignText (Open Design daemon + Anthropic BYOK only)
 */

/** Text or Anthropic multimodal blocks (design lane may attach images for Content Studio P3). */
export type AiMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: {
            type: "base64";
            media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
            data: string;
          };
        }
    >;

export type AiMessage = { role: "user"; content: AiMessageContent };

export type GenerateTextResult = {
  text: string;
  model: string;
  /** strategy-direct | open-design-daemon | openai-direct | gemini-direct */
  engine?: AiEngineId;
};

// strategy = text; design = Open Design daemon (identity/mockups only). Logo uses generateLogoText.
export type AiLane = "strategy" | "design";

export const MODELS = {
  get reasoning(): string {
    return getProviderConfig().model;
  },
  get parsing(): string {
    const cfg = getProviderConfig();
    if (cfg.provider === "anthropic") return "claude-haiku-4-5-20251001";
    return cfg.baseUrl ? cfg.model : "gpt-4o-mini";
  },
  /** Open Design daemon model (identity systems + mockups). */
  get design(): string {
    return getOpenDesignDaemonConfig().model;
  },
  /** Logo Workshop model (OpenAI). */
  get logo(): string {
    return getLogoApiConfig().model || "gpt-4o";
  },
} as const;

export function hasApiKey(): boolean {
  return Boolean(getProviderConfig().apiKey);
}

/** Anthropic BYOK available for Open Design daemon (Design Studio). */
export function hasOpenDesignKey(): boolean {
  return Boolean(getOpenDesignDaemonConfig().apiKey);
}

/** Logo Workshop: OpenAI key and/or Gemini fallback. */
export function hasLogoKey(): boolean {
  return logoApiKeyStatus().configured || hasGeminiKey();
}

function isRetriableProviderError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /429|quota|billing|rate limit|insufficient|exceeded|401|403|invalid.?api.?key|incorrect api key/i.test(
    msg
  );
}

/** Design Studio ready: OD daemon up + Anthropic BYOK. */
export async function hasOpenDesignEngine(): Promise<boolean> {
  return hasOpenDesignKey() && (await isOpenDesignDaemonUp());
}

/** Strategy/logo paths are text-only; flatten multimodal blocks if present. */
function flattenMessageContent(content: AiMessageContent): string {
  if (typeof content === "string") return content;
  return content
    .map((b) => (b.type === "text" ? b.text : "[image]"))
    .join("\n")
    .trim();
}

async function callStrategyProvider(params: {
  model?: string;
  maxTokens: number;
  system?: string;
  messages: AiMessage[];
  cacheSystem?: boolean;
}): Promise<GenerateTextResult> {
  const cfg = getProviderConfig();
  if (!cfg.apiKey) {
    throw new Error("No strategy API key configured — add it in Settings (Anthropic / GPT / …).");
  }
  const model = params.model ?? cfg.model;
  const textMessages = params.messages.map((m) => ({
    role: "user" as const,
    content: flattenMessageContent(m.content),
  }));

  if (cfg.provider === "anthropic") {
    const client = new Anthropic({ apiKey: cfg.apiKey });
    const system = params.system
      ? params.cacheSystem
        ? [{ type: "text" as const, text: params.system, cache_control: { type: "ephemeral" as const } }]
        : params.system
      : undefined;

    const stream = client.messages.stream({
      model,
      max_tokens: params.maxTokens,
      system,
      messages: textMessages,
    });

    const text = await stream.finalText();
    const message = await stream.finalMessage();
    const result: GenerateTextResult = {
      text: text.trim(),
      model: message.model,
      engine: "strategy-direct",
    };
    assertEngineForLane("strategy", result.engine);
    return result;
  }

  const result = await callOpenAiCompatible({
    apiKey: cfg.apiKey,
    baseUrl: cfg.baseUrl,
    model,
    maxTokens: params.maxTokens,
    system: params.system,
    messages: textMessages,
    engine: "strategy-direct",
  });
  assertEngineForLane("strategy", result.engine);
  return result;
}

async function callOpenAiCompatible(params: {
  apiKey: string;
  baseUrl: string | null;
  model: string;
  maxTokens: number;
  system?: string;
  messages: AiMessage[];
  engine: "strategy-direct" | "openai-direct" | "gemini-direct";
  /** Higher = more variety (logo candidates). Omit for provider default. */
  temperature?: number;
}): Promise<GenerateTextResult> {
  const baseUrl = (params.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const openaiMessages: { role: string; content: string }[] = [];
  if (params.system) openaiMessages.push({ role: "system", content: params.system });
  for (const m of params.messages) {
    openaiMessages.push({ role: m.role, content: flattenMessageContent(m.content) });
  }

  const body: Record<string, unknown> = {
    model: params.model,
    max_tokens: params.maxTokens,
    messages: openaiMessages,
  };
  if (typeof params.temperature === "number") {
    body.temperature = params.temperature;
  }

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Math.max(120_000, params.maxTokens * 25)),
  });

  const data = (await resp.json()) as {
    error?: { message?: string };
    choices?: [{ message?: { content?: string } }];
    model?: string;
  };
  if (!resp.ok) {
    const msg = data.error?.message ?? `API error: ${resp.status}`;
    if (resp.status === 429 || /quota|billing|rate limit/i.test(msg)) {
      throw new Error(
        `${msg} — Check provider billing/quota, or wait and retry.`
      );
    }
    throw new Error(msg);
  }
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text: text.trim(), model: data.model ?? params.model, engine: params.engine };
}

/** Google Gemini — native generateContent first (most reliable), OpenAI-compat second. */
async function callGemini(params: {
  maxTokens: number;
  system?: string;
  messages: AiMessage[];
  model?: string;
}): Promise<GenerateTextResult> {
  const cfg = getGeminiConfig();
  if (!cfg.apiKey) {
    throw new Error("No Gemini API key — set GEMINI_API_KEY in .env.local");
  }
  const model = params.model ?? cfg.model;

  // 1) Native generateContent (best for free-tier / AQ keys)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const m of params.messages) {
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: flattenMessageContent(m.content) }],
    });
  }
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: params.maxTokens,
      // Helps logo pipeline extractJson; ignore if model rejects the field.
      responseMimeType: "application/json",
    },
  };
  if (params.system) {
    body.systemInstruction = { parts: [{ text: params.system }] };
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Math.max(120_000, params.maxTokens * 25)),
    });
    const data = (await resp.json()) as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    if (!resp.ok) {
      throw new Error(data.error?.message ?? `Gemini API error: ${resp.status}`);
    }
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) {
      throw new Error("Gemini returned an empty response");
    }
    return { text: text.trim(), model, engine: "gemini-direct" };
  } catch (nativeError) {
    // 2) OpenAI-compatible endpoint fallback
    try {
      return await callOpenAiCompatible({
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        model,
        maxTokens: params.maxTokens,
        system: params.system,
        messages: params.messages,
        engine: "gemini-direct",
      });
    } catch (compatError) {
      const a = nativeError instanceof Error ? nativeError.message : String(nativeError);
      const b = compatError instanceof Error ? compatError.message : String(compatError);
      throw new Error(`Gemini native failed (${a}). OpenAI-compat also failed: ${b}`);
    }
  }
}

/**
 * - strategy (default): Settings Anthropic/GPT in Faro — never OD, never logo keys
 * - design: Open Design daemon only (never OpenAI / Gemini / strategy-as-design substitute)
 * Logo Workshop must use generateLogoText — not this function.
 * @see docs/11-ai-lanes.md
 */
export async function generateText(params: {
  lane?: AiLane;
  model?: string;
  maxTokens: number;
  system?: string;
  messages: AiMessage[];
  cacheSystem?: boolean;
}): Promise<GenerateTextResult> {
  if ((params.lane ?? "strategy") === "design") {
    return generateDesignText(params);
  }
  return callStrategyProvider(params);
}

export async function generateStrategyText(
  params: Omit<Parameters<typeof generateText>[0], "lane">
): Promise<GenerateTextResult> {
  return callStrategyProvider(params);
}

/**
 * Design Studio ONLY (identity systems + landing/deck mockups).
 * Always Open Design daemon + Anthropic BYOK — never OpenAI, never Gemini.
 * @see docs/11-ai-lanes.md
 */
export async function generateDesignText(
  params: Omit<Parameters<typeof generateText>[0], "lane">
): Promise<GenerateTextResult> {
  const cfg = getOpenDesignDaemonConfig();
  if (!cfg.apiKey) {
    throw new Error(
      "Design Studio needs an Anthropic API key for Open Design (BYOK). Save it in Strategy Settings (Anthropic) or as an Anthropic graphics key. Logos use OpenAI/Gemini separately. See docs/11-ai-lanes.md."
    );
  }
  if (!(await isOpenDesignDaemonUp())) {
    throw new Error(
      "Open Design daemon is not running. Run start.bat / start.ps1, or start-open-design.ps1 (port 7456). Identity systems and mockups require the OD engine — not OpenAI or Gemini. See docs/11-ai-lanes.md."
    );
  }

  const model = params.model ?? MODELS.design;
  const result = await generateViaOpenDesign({
    system: params.system,
    messages: params.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    maxTokens: params.maxTokens,
    model,
    apiKey: cfg.apiKey,
  });
  const out: GenerateTextResult = {
    text: result.text,
    model: result.model,
    engine: "open-design-daemon",
  };
  assertEngineForLane("design", out.engine);
  return out;
}

/**
 * Logo Workshop ONLY.
 * OpenAI first → Gemini fallback on quota/auth errors. Never the OD daemon. Never strategy key.
 * @see docs/11-ai-lanes.md
 */
export async function generateLogoText(
  params: Omit<Parameters<typeof generateText>[0], "lane"> & {
    /** Creativity for logo candidates (default 0.95). Judge calls can pass lower. */
    temperature?: number;
  }
): Promise<GenerateTextResult> {
  const logo = getLogoApiConfig();
  const model = params.model ?? MODELS.logo;
  const temperature = params.temperature ?? 0.95;

  async function primaryOpenAi(): Promise<GenerateTextResult> {
    if (!logo.apiKey) {
      throw new Error(
        "No OpenAI logo key — save an OpenAI API key in Settings (Logo Workshop), or set OPENAI_API_KEY."
      );
    }
    return callOpenAiCompatible({
      apiKey: logo.apiKey,
      baseUrl: logo.baseUrl,
      model: model || "gpt-4o",
      maxTokens: params.maxTokens,
      system: params.system,
      messages: params.messages,
      engine: "openai-direct",
      temperature,
    });
  }

  // No OpenAI key → Gemini only
  if (!logo.apiKey) {
    if (hasGeminiKey()) {
      console.warn("[ai] no OpenAI logo key — using Gemini");
      const result = await callGemini({
        maxTokens: params.maxTokens,
        system: params.system,
        messages: params.messages,
      });
      assertEngineForLane("logo", result.engine);
      return result;
    }
    throw new Error(
      "No logo AI key — save OpenAI in Settings, or set GEMINI_API_KEY in .env.local as fallback. Strategy and Design Studio keys are not used for logos."
    );
  }

  try {
    const result = await primaryOpenAi();
    assertEngineForLane("logo", result.engine);
    return result;
  } catch (primaryError) {
    if (!hasGeminiKey() || !isRetriableProviderError(primaryError)) {
      throw primaryError;
    }
    const reason = primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn("[ai] OpenAI logo failed; falling back to Gemini:", reason.slice(0, 160));
    try {
      const result = await callGemini({
        maxTokens: params.maxTokens,
        system: params.system,
        messages: params.messages,
      });
      assertEngineForLane("logo", result.engine);
      return result;
    } catch (geminiError) {
      const gMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
      throw new Error(
        `OpenAI logo failed (${reason.slice(0, 120)}). Gemini fallback also failed: ${gMsg}`
      );
    }
  }
}

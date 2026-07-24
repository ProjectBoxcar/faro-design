import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getProviderConfig, getOpenDesignConfig } from "@/lib/settings";
import { generateViaOpenDesign, isOpenDesignDaemonUp } from "@/lib/open-design-engine";
import type { AiProvider } from "@/lib/db/types";

export type AiMessage = { role: "user"; content: string };

export type GenerateTextResult = {
  text: string;
  model: string;
  /** strategy-direct = Faro→provider; open-design-daemon = graphics via OD only */
  engine?: "open-design-daemon" | "strategy-direct";
};

// strategy = text (intake/synthesis). design = graphics via Open Design daemon only.
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
  get design(): string {
    return getOpenDesignConfig().model;
  },
} as const;

export function hasApiKey(): boolean {
  return Boolean(getProviderConfig().apiKey);
}

/** BYOK key available for OD (usually the Anthropic key in Settings). */
export function hasOpenDesignKey(): boolean {
  return Boolean(getOpenDesignConfig().apiKey);
}

export async function hasOpenDesignEngine(): Promise<boolean> {
  return hasOpenDesignKey() && (await isOpenDesignDaemonUp());
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
      messages: params.messages,
    });

    const text = await stream.finalText();
    const message = await stream.finalMessage();
    return { text: text.trim(), model: message.model, engine: "strategy-direct" };
  }

  const baseUrl = (cfg.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const openaiMessages: { role: string; content: string }[] = [];
  if (params.system) openaiMessages.push({ role: "system", content: params.system });
  for (const m of params.messages) openaiMessages.push({ role: m.role, content: m.content });

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens,
      messages: openaiMessages,
    }),
  });

  const data = (await resp.json()) as {
    error?: { message?: string };
    choices?: [{ message?: { content?: string } }];
    model?: string;
  };
  if (!resp.ok) {
    throw new Error(data.error?.message ?? `API error: ${resp.status}`);
  }
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text: text.trim(), model: data.model ?? model, engine: "strategy-direct" };
}

/**
 * - strategy (default): Settings Anthropic/GPT in Faro
 * - design: Open Design daemon only (never Anthropic SDK in Faro)
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
 * Logo Workshop + Design Studio ONLY.
 * Calls the Open Design daemon — does not use Faro's Anthropic client for graphics.
 */
export async function generateDesignText(
  params: Omit<Parameters<typeof generateText>[0], "lane">
): Promise<GenerateTextResult> {
  const cfg = getOpenDesignConfig();
  if (!cfg.apiKey) {
    throw new Error(
      "No Anthropic key for Open Design BYOK — save your key in Settings. OD uses it; Faro does not generate graphics itself."
    );
  }
  if (!(await isOpenDesignDaemonUp())) {
    throw new Error(
      "Open Design daemon is not running. Start start-open-design.ps1 (or the OD daemon on port 7456). Logo Workshop and Design Studio require the OD engine."
    );
  }

  const result = await generateViaOpenDesign({
    system: params.system,
    messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
    maxTokens: params.maxTokens,
    model: params.model ?? MODELS.design,
    apiKey: cfg.apiKey,
  });
  return { text: result.text, model: result.model, engine: "open-design-daemon" };
}

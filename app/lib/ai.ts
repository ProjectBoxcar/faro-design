import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getProviderConfig, getDefaultModel } from "@/lib/settings";

export type AiMessage = { role: "user"; content: string };

export type GenerateTextResult = {
  text: string;
  model: string;
};

// Model selection: the reasoning default is the user's configured model;
// parsing uses a cheap model appropriate to the active provider.
export const MODELS = {
  get reasoning(): string {
    return getDefaultModel();
  },
  get parsing(): string {
    const cfg = getProviderConfig();
    return cfg.provider === "anthropic" ? "claude-haiku-4-5-20251001" : "gpt-4o-mini";
  },
} as const;

// True when a key is available (from the in-app Settings page or the env var).
export function hasApiKey(): boolean {
  return Boolean(getProviderConfig().apiKey);
}

// Generate text using the configured AI provider.
// - Anthropic: uses the Anthropic SDK with optional prompt caching and streaming.
//   Streaming lets us request large design artifact outputs (up to the model ceiling)
//   without hitting the non-streaming 10-minute SDK guard.
// - OpenAI-compatible: uses a fetch to the provider's /chat/completions endpoint.
//   Supports OpenAI, OpenRouter, Groq, Together, Ollama, etc.
export async function generateText(params: {
  model?: string;
  maxTokens: number;
  system?: string;
  messages: AiMessage[];
  cacheSystem?: boolean;
}): Promise<GenerateTextResult> {
  const cfg = getProviderConfig();
  if (!cfg.apiKey) throw new Error("No API key configured — add it in Settings.");
  const model = params.model ?? cfg.model;

  if (cfg.provider === "anthropic") {
    const client = new Anthropic({ apiKey: cfg.apiKey });
    const system = params.system
      ? params.cacheSystem
        ? [{ type: "text" as const, text: params.system, cache_control: { type: "ephemeral" as const } }]
        : params.system
      : undefined;

    // Anthropic recommends (and the SDK enforces for large max_tokens) streaming for
    // long-running generation. Stream and collect the text for a single return value.
    const stream = client.messages.stream({
      model,
      max_tokens: params.maxTokens,
      system,
      messages: params.messages,
    });

    const text = await stream.finalText();
    const message = await stream.finalMessage();
    return { text: text.trim(), model: message.model };
  }

  // OpenAI-compatible provider.
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
    throw new Error(data.error?.message ?? `OpenAI-compatible API error: ${resp.status}`);
  }
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text: text.trim(), model: data.model ?? model };
}

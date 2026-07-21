import { NextResponse } from "next/server";
import { z } from "zod";
import {
  setApiKey,
  setProvider,
  setBaseUrl,
  setAiModel,
  apiKeyStatus,
  getProviderConfig,
} from "@/lib/settings";
import type { AiProvider } from "@/lib/db/types";
import { publicProviderConfig } from "@/lib/settings-public";

const SaveSchema = z.object({
  apiKey: z.string().optional(), // empty/omitted clears it
  provider: z.enum(["anthropic", "openai-compatible"]).optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
});

export async function GET() {
  return NextResponse.json({
    ...apiKeyStatus(),
    ...publicProviderConfig(getProviderConfig()),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { apiKey, provider, baseUrl, model } = parsed.data;
  const key = (apiKey ?? "").trim();
  if (key) {
    // Accept Anthropic keys (sk-ant-...) and OpenAI-compatible keys (sk-...).
    if (!key.startsWith("sk-")) {
      return NextResponse.json(
        { error: "That doesn't look like an API key (they start with “sk-”)." },
        { status: 400 }
      );
    }
    setApiKey(key || null);
  }
  if (provider) setProvider(provider as AiProvider);
  if (baseUrl !== undefined) setBaseUrl(baseUrl.trim() || null);
  if (model !== undefined) setAiModel(model.trim() || null);
  return NextResponse.json({
    ...apiKeyStatus(),
    ...publicProviderConfig(getProviderConfig()),
  });
}

export async function DELETE() {
  setApiKey(null);
  return NextResponse.json({
    ...apiKeyStatus(),
    ...publicProviderConfig(getProviderConfig()),
  });
}

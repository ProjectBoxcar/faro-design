import { NextResponse } from "next/server";
import { z } from "zod";
import {
  setApiKey,
  setProvider,
  setBaseUrl,
  setAiModel,
  apiKeyStatus,
  getProviderConfig,
  setDesignApiKey,
  setDesignProvider,
  setDesignBaseUrl,
  setDesignModel,
  designApiKeyStatus,
  getOpenDesignConfig,
} from "@/lib/settings";
import type { AiProvider } from "@/lib/db/types";
import { publicProviderConfig } from "@/lib/settings-public";

const SaveSchema = z.object({
  // Strategy lane
  apiKey: z.string().optional(),
  provider: z.enum(["anthropic", "openai-compatible"]).optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  // Open Design lane (graphics only)
  designApiKey: z.string().optional(),
  designProvider: z.enum(["anthropic", "openai-compatible"]).optional(),
  designBaseUrl: z.string().optional(),
  designModel: z.string().optional(),
});

function settingsPayload() {
  return {
    strategy: {
      ...apiKeyStatus(),
      ...publicProviderConfig(getProviderConfig()),
    },
    openDesign: {
      ...designApiKeyStatus(),
      ...publicProviderConfig(getOpenDesignConfig()),
    },
    // Back-compat for older SettingsForm consumers
    ...apiKeyStatus(),
    ...publicProviderConfig(getProviderConfig()),
  };
}

export async function GET() {
  return NextResponse.json(settingsPayload());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const {
    apiKey,
    provider,
    baseUrl,
    model,
    designApiKey,
    designProvider,
    designBaseUrl,
    designModel,
  } = parsed.data;

  const key = (apiKey ?? "").trim();
  if (key) {
    if (!key.startsWith("sk-")) {
      return NextResponse.json(
        { error: "That doesn't look like an API key (they start with “sk-”)." },
        { status: 400 }
      );
    }
    setApiKey(key);
  }
  if (provider) setProvider(provider as AiProvider);
  if (baseUrl !== undefined) setBaseUrl(baseUrl.trim() || null);
  if (model !== undefined) setAiModel(model.trim() || null);

  const dKey = (designApiKey ?? "").trim();
  if (dKey) {
    if (!dKey.startsWith("sk-") && !dKey.startsWith("od-")) {
      // Allow sk-… and open-design-style od-… keys
      return NextResponse.json(
        { error: "Open Design API key should start with “sk-” or “od-”." },
        { status: 400 }
      );
    }
    setDesignApiKey(dKey);
  }
  if (designProvider) setDesignProvider(designProvider as AiProvider);
  if (designBaseUrl !== undefined) setDesignBaseUrl(designBaseUrl.trim() || null);
  if (designModel !== undefined) setDesignModel(designModel.trim() || null);

  return NextResponse.json(settingsPayload());
}

export async function DELETE() {
  setApiKey(null);
  setDesignApiKey(null);
  return NextResponse.json(settingsPayload());
}

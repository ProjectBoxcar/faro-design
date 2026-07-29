import { NextResponse } from "next/server";
import { z } from "zod";
import {
  setApiKey,
  setProvider,
  setBaseUrl,
  setAiModel,
  setDesignApiKey,
  setDesignProvider,
  setDesignBaseUrl,
  setDesignModel,
  getAiLaneHealthSnapshot,
} from "@/lib/settings";
import type { AiProvider } from "@/lib/db/types";
import { isOpenDesignDaemonUp } from "@/lib/open-design-engine";
import { brandMemoryStats } from "@/lib/brand-memory";

const SaveSchema = z.object({
  // Strategy lane
  apiKey: z.string().optional(),
  provider: z.enum(["anthropic", "openai-compatible"]).optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  clearStrategyKey: z.boolean().optional(),
  // Graphics field: OpenAI → Logo Workshop; sk-ant → OD BYOK (see docs/11-ai-lanes.md)
  designApiKey: z.string().optional(),
  designProvider: z.enum(["anthropic", "openai-compatible"]).optional(),
  designBaseUrl: z.string().optional(),
  designModel: z.string().optional(),
  clearDesignKey: z.boolean().optional(),
});

async function settingsPayload() {
  let daemonUp: boolean | null = null;
  try {
    daemonUp = await isOpenDesignDaemonUp();
  } catch {
    daemonUp = false;
  }
  const setup = getAiLaneHealthSnapshot(daemonUp);
  return {
    ...setup,
    brandMemory: brandMemoryStats(),
    // Flat back-compat for older clients
    configured: setup.strategy.configured,
    source: setup.strategy.source,
    provider: setup.strategy.provider,
    baseUrl: setup.strategy.baseUrl,
    model: setup.strategy.model,
  };
}

export async function GET() {
  return NextResponse.json(await settingsPayload());
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
    clearStrategyKey,
    designApiKey,
    designProvider,
    designBaseUrl,
    designModel,
    clearDesignKey,
  } = parsed.data;

  if (clearStrategyKey) {
    setApiKey(null);
  } else {
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
  }
  if (provider) setProvider(provider as AiProvider);
  if (baseUrl !== undefined) setBaseUrl(baseUrl.trim() || null);
  if (model !== undefined) setAiModel(model.trim() || null);

  if (clearDesignKey) {
    setDesignApiKey(null);
  } else {
    const dKey = (designApiKey ?? "").trim();
    if (dKey) {
      if (!dKey.startsWith("sk-") && !dKey.startsWith("od-")) {
        return NextResponse.json(
          { error: "Graphics API key should start with “sk-” or “od-”." },
          { status: 400 }
        );
      }
      setDesignApiKey(dKey);
    }
  }
  if (designProvider) setDesignProvider(designProvider as AiProvider);
  if (designBaseUrl !== undefined) setDesignBaseUrl(designBaseUrl.trim() || null);
  if (designModel !== undefined) setDesignModel(designModel.trim() || null);

  return NextResponse.json(await settingsPayload());
}

export async function DELETE() {
  setApiKey(null);
  setDesignApiKey(null);
  return NextResponse.json(await settingsPayload());
}

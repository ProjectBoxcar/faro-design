import { NextResponse } from "next/server";
import { z } from "zod";
import {
  setApiKey,
  setProvider,
  setBaseUrl,
  setAiModel,
  setDesignApiKey,
  setLogoApiKey,
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
  // OpenAI logo key only. Claude keys (sk-ant) belong in apiKey.
  designApiKey: z.string().optional(),
  logoApiKey: z.string().optional(),
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
    logoApiKey,
    designProvider,
    designBaseUrl,
    designModel,
    clearDesignKey,
  } = parsed.data;

  const postedLogoKey = (logoApiKey ?? "").trim();
  if (postedLogoKey.startsWith("sk-ant")) {
    return NextResponse.json(
      {
        error:
          "That is a Claude key. Paste it in the design helper field. The OpenAI field is only for logo generation.",
      },
      { status: 400 }
    );
  }

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

  if (postedLogoKey) {
    if (!postedLogoKey.startsWith("sk-")) {
      return NextResponse.json(
        { error: "The logo key should start with “sk-”." },
        { status: 400 }
      );
    }
    setLogoApiKey(postedLogoKey);
  }

  if (clearDesignKey) {
    setDesignApiKey(null);
    setLogoApiKey(null);
  } else {
    const dKey = (designApiKey ?? "").trim();
    if (dKey) {
      if (dKey.startsWith("sk-ant")) {
        setDesignApiKey(dKey);
      } else if (dKey.startsWith("sk-") || dKey.startsWith("od-")) {
        // Older clients still post the OpenAI logo key as designApiKey.
        setLogoApiKey(dKey);
      } else {
        return NextResponse.json(
          { error: "A design helper key should be a Claude key (it starts with “sk-ant”)." },
          { status: 400 }
        );
      }
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
  setLogoApiKey(null);
  return NextResponse.json(await settingsPayload());
}

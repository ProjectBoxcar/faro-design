import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/ai";
import {
  generateDesignSystem,
  generateLandingPage,
  generateBrandDeck,
  listAssets,
} from "@/lib/design";
import { getProject } from "@/lib/queries";

const GenerateSchema = z.object({
  projectId: z.string().min(1),
  kind: z.enum(["design_system", "landing_page", "deck"]),
});

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "AI isn't configured yet — add your Anthropic API key in Settings." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!getProject(parsed.data.projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    let asset;
    switch (parsed.data.kind) {
      case "design_system":
        asset = await generateDesignSystem(parsed.data.projectId);
        break;
      case "landing_page":
        asset = await generateLandingPage(parsed.data.projectId);
        break;
      case "deck":
        asset = await generateBrandDeck(parsed.data.projectId);
        break;
    }
    return NextResponse.json({ asset });
  } catch (e) {
    console.error("[design] generation failed:", e);
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const ListSchema = z.object({
  projectId: z.string().min(1),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = ListSchema.safeParse({
    projectId: searchParams.get("projectId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!getProject(parsed.data.projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const assets = listAssets(parsed.data.projectId);
  return NextResponse.json({ assets });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/ai";
import {
  generateDesignSystem,
  generateDesignSystemProposals,
  generateLandingPage,
  generateLandingPageProposals,
  generateBrandDeck,
  generateBrandDeckProposals,
  listAssets,
} from "@/lib/design";
import { getProject } from "@/lib/queries";
import type { AssetKind } from "@/lib/db/types";

const GenerateSchema = z.object({
  projectId: z.string().min(1),
  kind: z.enum(["design_system", "landing_page", "deck"]),
  count: z.number().int().min(1).max(6).optional(),
  designSystemId: z.string().min(1).optional(),
  variant: z.string().min(1).max(5).optional(),
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

  const { projectId, kind, count = 1, designSystemId, variant } = parsed.data;

  if (!getProject(projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    let result;
    if (count > 1) {
      // Proposals workflow: generate multiple variants.
      switch (kind) {
        case "design_system":
          result = { assets: await generateDesignSystemProposals(projectId, count) };
          break;
        case "landing_page":
          if (!designSystemId) {
            return NextResponse.json(
              { error: "designSystemId is required to generate landing page proposals" },
              { status: 400 }
            );
          }
          result = { assets: await generateLandingPageProposals(projectId, designSystemId, count) };
          break;
        case "deck":
          if (!designSystemId) {
            return NextResponse.json(
              { error: "designSystemId is required to generate deck proposals" },
              { status: 400 }
            );
          }
          result = { assets: await generateBrandDeckProposals(projectId, designSystemId, count) };
          break;
      }
    } else if (variant) {
      // Single named proposal.
      switch (kind) {
        case "design_system":
          result = { asset: await generateDesignSystem(projectId) };
          break;
        case "landing_page":
          if (!designSystemId) {
            return NextResponse.json(
              { error: "designSystemId is required to generate landing page proposals" },
              { status: 400 }
            );
          }
          result = { asset: await generateLandingPage(projectId) };
          break;
        case "deck":
          if (!designSystemId) {
            return NextResponse.json(
              { error: "designSystemId is required to generate deck proposals" },
              { status: 400 }
            );
          }
          result = { asset: await generateBrandDeck(projectId) };
          break;
      }
    } else {
      // Backwards-compatible single generation; uses the selected design system.
      switch (kind) {
        case "design_system":
          result = { asset: await generateDesignSystem(projectId) };
          break;
        case "landing_page":
          result = { asset: await generateLandingPage(projectId) };
          break;
        case "deck":
          result = { asset: await generateBrandDeck(projectId) };
          break;
      }
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("[design] generation failed:", e);
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const ListSchema = z.object({
  projectId: z.string().min(1),
  kind: z.enum(["design_system", "landing_page", "deck", "brand_guidelines", "logo_concept"]).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = ListSchema.safeParse({
    projectId: searchParams.get("projectId"),
    kind: searchParams.get("kind") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { projectId, kind } = parsed.data;
  if (!getProject(projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const assets = kind ? listAssets(projectId, kind as AssetKind) : listAssets(projectId);
  return NextResponse.json({ assets });
}

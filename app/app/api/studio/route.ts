import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/ai";
import {
  getProject,
  chooseStudioAsset,
  approveStudioAsset,
  revokeStudioAssetApproval,
  discardStudioAsset,
} from "@/lib/queries";
import { generateLogoCandidates, logoWorkspace, studioBlockedReason } from "@/lib/studio";

// Two Opus calls (generate + judge) can take a while.
export const maxDuration = 300;

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), projectId: z.string().min(1) }),
  z.object({ action: z.literal("variations"), projectId: z.string().min(1), assetId: z.string().min(1) }),
  z.object({ action: z.literal("choose"), projectId: z.string().min(1), assetId: z.string().min(1) }),
  // "approve" is the human gate — this endpoint is only ever reached by the
  // owner pressing the Approve button. No server code calls it.
  z.object({ action: z.literal("approve"), projectId: z.string().min(1), assetId: z.string().min(1) }),
  z.object({ action: z.literal("revoke-approval"), projectId: z.string().min(1), assetId: z.string().min(1) }),
  z.object({ action: z.literal("discard"), projectId: z.string().min(1), assetId: z.string().min(1) }),
]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;
  if (!getProject(input.projectId)) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }
  const blocked = studioBlockedReason(input.projectId, "logo");
  if (blocked && ["generate", "variations", "choose", "approve"].includes(input.action)) {
    return NextResponse.json({ error: blocked }, { status: 409 });
  }

  try {
    switch (input.action) {
      case "generate":
      case "variations": {
        if (!hasApiKey()) {
          return NextResponse.json(
            { error: "AI isn't configured yet — add your Anthropic API key in Settings." },
            { status: 400 }
          );
        }
        const result = await generateLogoCandidates(
          input.projectId,
          input.action === "variations" ? input.assetId : undefined
        );
        return NextResponse.json({ discarded: result.discarded, workspace: logoWorkspace(input.projectId) });
      }
      case "choose":
        chooseStudioAsset(input.projectId, input.assetId);
        break;
      case "approve":
        approveStudioAsset(input.projectId, input.assetId);
        break;
      case "revoke-approval":
        revokeStudioAssetApproval(input.projectId, input.assetId);
        break;
      case "discard":
        discardStudioAsset(input.projectId, input.assetId);
        break;
    }
    return NextResponse.json({ workspace: logoWorkspace(input.projectId) });
  } catch (e) {
    console.error("[studio] failed:", e);
    const message = e instanceof Error ? e.message : "Studio action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

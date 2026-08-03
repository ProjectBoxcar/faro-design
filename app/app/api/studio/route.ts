import { NextResponse } from "next/server";
import { z } from "zod";
import { hasLogoKey } from "@/lib/ai";
import {
  getProject,
  chooseStudioAsset,
  approveStudioAsset,
  revokeStudioAssetApproval,
  discardStudioAsset,
} from "@/lib/queries";
import {
  cancelLogoGeneration,
  generateLogoCandidates,
  logoWorkspace,
  studioBlockedReason,
} from "@/lib/studio";

// Two Opus calls (generate + judge) can take a while.
export const maxDuration = 300;

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), projectId: z.string().min(1) }),
  z.object({
    action: z.literal("variations"),
    projectId: z.string().min(1),
    assetId: z.string().min(1),
    /** Owner notes to steer refinements of a liked direction. */
    feedback: z.string().max(2000).optional(),
  }),
  z.object({ action: z.literal("cancel"), projectId: z.string().min(1) }),
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
  if (input.action === "cancel") {
    cancelLogoGeneration(input.projectId);
    return NextResponse.json({ ok: true, workspace: logoWorkspace(input.projectId) });
  }
  const blocked = studioBlockedReason(input.projectId, "logo");
  if (blocked && ["generate", "variations", "choose", "approve"].includes(input.action)) {
    return NextResponse.json({ error: blocked }, { status: 409 });
  }

  try {
    switch (input.action) {
      case "generate":
      case "variations": {
        if (!hasLogoKey()) {
          return NextResponse.json(
            {
              error:
                "No logo AI key — save an OpenAI API key in Settings (graphics → OpenAI-compatible).",
            },
            { status: 400 }
          );
        }
        const result = await generateLogoCandidates(
          input.projectId,
          input.action === "variations" ? input.assetId : undefined,
          input.action === "variations" ? input.feedback?.trim() || undefined : undefined
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
    // Logo approve unlocks Design Studio → phase "design"; revoke can step back.
    if (input.action === "approve" || input.action === "revoke-approval") {
      try {
        const { syncProjectLifecycle } = await import("@/lib/project-lifecycle");
        syncProjectLifecycle(input.projectId);
      } catch (e) {
        console.warn("[lifecycle] studio sync failed:", e);
      }
    }
    return NextResponse.json({ workspace: logoWorkspace(input.projectId) });
  } catch (e) {
    if (e instanceof Error && (e.name === "LogoGenerationCancelled" || e.message === "Generation stopped.")) {
      return NextResponse.json({ error: "Generation stopped.", cancelled: true }, { status: 499 });
    }
    console.error("[studio] failed:", e);
    const message = e instanceof Error ? e.message : "Studio action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

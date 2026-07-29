import { NextResponse } from "next/server";
import { getProject, publishProject, unpublishProject, setProjectPhase } from "@/lib/queries";
import { z } from "zod";
import { viabilityActionBlockedReason } from "@/lib/project-gates";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { listAssets } from "@/lib/design";
import {
  clearCurrentSnapshots,
  createPublishSnapshot,
  getCurrentSnapshotForProject,
} from "@/lib/publish-snapshot";

const PublishSchema = z.object({
  projectId: z.string().min(1),
  action: z.enum(["publish", "unpublish"]).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = PublishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const project = getProject(parsed.data.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const action = parsed.data.action ?? "publish";
  if (action === "unpublish") {
    unpublishProject(parsed.data.projectId);
    clearCurrentSnapshots(parsed.data.projectId);
    return NextResponse.json({ ok: true });
  }
  const blocked = viabilityActionBlockedReason(project, "publish");
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });

  let token: string;
  try {
    token = publishProject(parsed.data.projectId);
    createPublishSnapshot(parsed.data.projectId, token);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not publish";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Publishing with the full design package on file completes the journey.
  if (!finalDeliverableIssue(listAssets(parsed.data.projectId))) {
    setProjectPhase(parsed.data.projectId, "finished");
  }
  try {
    const { recordPackageLearning } = await import("@/lib/brand-memory");
    recordPackageLearning(parsed.data.projectId);
  } catch (e) {
    console.warn("[brand-memory] package learn failed:", e);
  }

  const snap = getCurrentSnapshotForProject(parsed.data.projectId);
  return NextResponse.json({
    token,
    version: snap?.version ?? null,
    publishedAt: snap?.payload?.publishedAt ?? null,
    packageReady: snap?.payload?.package?.ready ?? false,
  });
}

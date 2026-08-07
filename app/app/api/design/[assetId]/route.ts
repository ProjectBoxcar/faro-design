import { NextResponse } from "next/server";
import { getAsset, selectAsset, deleteAsset } from "@/lib/design";
import { getProject } from "@/lib/queries";
import { createDesignJob, serializeDesignJob } from "@/lib/design-jobs";
import { canEnterDesignStudio } from "@/lib/studio";
import { hasOpenDesignKey } from "@/lib/ai";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const searchParams = new URL(req.url).searchParams;
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }
  if (!getProject(projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const asset = getAsset(projectId, assetId);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ asset });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const searchParams = new URL(req.url).searchParams;
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }
  const project = getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!getAsset(projectId, assetId)) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === "select") {
    const asset = selectAsset(projectId, assetId);

    // Identity final → start application mockups on the server so API clients
    // and the UI both get the same path (UI may also poll the returned job).
    let mockupsJob = null;
    if (asset.kind === "design_system") {
      const enter = canEnterDesignStudio(projectId);
      if (enter.ok && hasOpenDesignKey()) {
        try {
          const { ensureOpenDesignDaemon } = await import("@/lib/open-design-ensure");
          await ensureOpenDesignDaemon();
          const job = createDesignJob({
            projectId,
            kind: "mockups",
            count: 2,
            designSystemId: asset.id,
          });
          mockupsJob = serializeDesignJob(job);
        } catch (e) {
          console.warn("[design] auto mockups after identity select failed:", e);
        }
      }
    }

    // Selecting landing/deck finals may complete the package → re-freeze share.
    let lifecycle = null;
    try {
      const { syncProjectLifecycle } = await import("@/lib/project-lifecycle");
      lifecycle = syncProjectLifecycle(projectId);
    } catch (e) {
      console.warn("[lifecycle] design select sync failed:", e);
    }

    return NextResponse.json({ asset, job: mockupsJob, lifecycle });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const searchParams = new URL(req.url).searchParams;
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }
  if (!getProject(projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!getAsset(projectId, assetId)) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  deleteAsset(projectId, assetId);
  return NextResponse.json({ ok: true });
}

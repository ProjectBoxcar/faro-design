import { NextResponse } from "next/server";
import { z } from "zod";
import { hasOpenDesignKey } from "@/lib/ai";
import {
  generateDesignSystem,
  generateLandingPage,
  generateBrandDeck,
  listAssets,
  deleteAsset,
  deleteProposals,
} from "@/lib/design";
import { getProject } from "@/lib/queries";
import type { AssetKind } from "@/lib/db/types";
import { buildFaroDeliverable, sanitizeDownloadName } from "@/lib/design-deliverable";
import { viabilityActionBlockedReason } from "@/lib/project-gates";
import { canEnterDesignStudio } from "@/lib/studio";
import {
  cancelDesignJob,
  createDesignJob,
  designJobAssets,
  getDesignJob,
  serializeDesignJob,
  startDesignJob,
} from "@/lib/design-jobs";

const GenerateSchema = z.object({
  projectId: z.string().min(1),
  kind: z.enum([
    "design_system",
    "landing_page",
    "deck",
    "mockups",
    "channels",
    "sms",
    "email",
    "ad",
    "print",
  ]),
  count: z.number().int().min(1).max(6).optional(),
  designSystemId: z.string().min(1).optional(),
  variant: z.string().min(1).max(5).optional(),
  /** Owner notes when improving a liked identity proposal. */
  feedback: z.string().max(2000).optional(),
  refineFromAssetId: z.string().min(1).optional(),
});

const CancelJobSchema = z.object({
  action: z.literal("cancel"),
  projectId: z.string().min(1),
  jobId: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // Cancel does not need OD — only stops an in-memory/DB job.
  const cancelParsed = CancelJobSchema.safeParse(body);
  if (cancelParsed.success) {
    const { projectId, jobId } = cancelParsed.data;
    if (!getProject(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const job = cancelDesignJob(projectId, jobId);
    if (!job) return NextResponse.json({ error: "Design job not found" }, { status: 404 });
    return NextResponse.json({ job: serializeDesignJob(job) });
  }

  if (!hasOpenDesignKey()) {
    return NextResponse.json(
      {
        error:
          "Design Studio requires Open Design + an Anthropic key (BYOK). Save Anthropic in Strategy Settings, start the OD daemon (port 7456). Logos use OpenAI/Gemini separately — they do not power identity systems or mockups.",
      },
      { status: 400 }
    );
  }

  // Bring OD up if it died after app boot (Windows restarts, manual stop).
  const { ensureOpenDesignDaemon, openDesignNotRunningMessage } = await import(
    "@/lib/open-design-ensure"
  );
  if (!(await ensureOpenDesignDaemon())) {
    return NextResponse.json({ error: openDesignNotRunningMessage() }, { status: 503 });
  }

  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { projectId, kind, count = 1, designSystemId, variant, feedback, refineFromAssetId } =
    parsed.data;

  const project = getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const enter = canEnterDesignStudio(projectId);
  if (!enter.ok) {
    return NextResponse.json({ error: enter.reason || "Design Studio is locked" }, { status: 409 });
  }

  // Composite mockups job: landing page + deck, one each, applying the approved
  // identity per the design plan's execution order. Always runs as a job.
  if (kind === "mockups") {
    if (!designSystemId) {
      return NextResponse.json(
        { error: "designSystemId is required to create the application mockups" },
        { status: 400 }
      );
    }
    const job = createDesignJob({ projectId, kind, count: 2, designSystemId });
    return NextResponse.json({ job: serializeDesignJob(job) }, { status: 202 });
  }

  // Channel templates: SMS, email, ad, print — one each from the identity.
  if (kind === "channels") {
    if (!designSystemId) {
      return NextResponse.json(
        { error: "designSystemId is required to create channel templates" },
        { status: 400 }
      );
    }
    const job = createDesignJob({ projectId, kind, count: 4, designSystemId });
    return NextResponse.json({ job: serializeDesignJob(job) }, { status: 202 });
  }

  if (count > 1) {
    if (kind !== "design_system" && !designSystemId) {
      return NextResponse.json(
        { error: `designSystemId is required to generate ${kind.replace(/_/g, " ")} proposals` },
        { status: 400 }
      );
    }
    if (refineFromAssetId && kind !== "design_system") {
      return NextResponse.json(
        { error: "Improve with feedback is available for Brand Identity System proposals." },
        { status: 400 }
      );
    }
    const job = createDesignJob({
      projectId,
      kind,
      count,
      designSystemId,
      feedback,
      refineFromAssetId,
    });
    return NextResponse.json({ job: serializeDesignJob(job) }, { status: 202 });
  }

  try {
    let result;
    if (variant) {
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
  kind: z
    .enum([
      "design_system",
      "landing_page",
      "deck",
      "brand_guidelines",
      "logo_concept",
      "sms",
      "email",
      "ad",
      "print",
    ])
    .optional(),
  format: z.enum(["json", "deliverable"]).optional(),
  jobId: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = ListSchema.safeParse({
    projectId: searchParams.get("projectId"),
    kind: searchParams.get("kind") || undefined,
    format: searchParams.get("format") || undefined,
    jobId: searchParams.get("jobId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { projectId, kind, format = "json", jobId } = parsed.data;
  const project = getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (jobId) {
    const job = getDesignJob(projectId, jobId);
    if (!job) return NextResponse.json({ error: "Design job not found" }, { status: 404 });
    if (job.status === "queued" || job.status === "running") {
      void startDesignJob(job.id, { resume: true });
    }
    const refreshed = getDesignJob(projectId, jobId)!;
    return NextResponse.json({
      job: serializeDesignJob(refreshed),
      assets: refreshed.status === "complete" ? designJobAssets(refreshed) : [],
    });
  }

  const assets = format === "deliverable"
    ? listAssets(projectId)
    : kind
    ? listAssets(projectId, kind as AssetKind)
    : listAssets(projectId);
  if (format === "deliverable") {
    const blocked = viabilityActionBlockedReason(project, "deliverable");
    if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });
    try {
      let implementPackZipBase64: string | undefined;
      let implementPackFilename: string | undefined;
      try {
        const { buildBrandPack, zipBrandPack } = await import("@/lib/brand-pack");
        const pack = buildBrandPack(projectId);
        implementPackZipBase64 = zipBrandPack(pack.files).toString("base64");
        implementPackFilename = pack.downloadName;
      } catch {
        // Visual package still ships if pack extraction fails.
      }
      const html = buildFaroDeliverable(project.name, assets, {
        implementPackZipBase64,
        implementPackFilename,
      });
      const filename = `${sanitizeDownloadName(project.name)}-faro-brand-deliverable.html`;
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Final deliverable could not be created";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  return NextResponse.json({ assets });
}

const DiscardByKindSchema = z.object({
  projectId: z.string().min(1),
  kind: z.enum(["design_system", "landing_page", "deck"]),
});

const DiscardByIdsSchema = z.object({
  projectId: z.string().min(1),
  assetIds: z.array(z.string().min(1)).min(1).max(50),
});

export async function DELETE(req: Request) {
  // Bulk delete by id list (JSON body) — preferred path for multi-select.
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const byIds = DiscardByIdsSchema.safeParse(body);
    if (byIds.success) {
      const { projectId, assetIds } = byIds.data;
      if (!getProject(projectId)) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      let discarded = 0;
      for (const assetId of assetIds) {
        if (!listAssets(projectId).some((a) => a.id === assetId)) continue;
        deleteAsset(projectId, assetId);
        discarded += 1;
      }
      return NextResponse.json({ discarded });
    }
  }

  const { searchParams } = new URL(req.url);
  const parsed = DiscardByKindSchema.safeParse({
    projectId: searchParams.get("projectId"),
    kind: searchParams.get("kind"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { projectId, kind } = parsed.data;
  if (!getProject(projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const discarded = listAssets(projectId, kind).filter((asset) => !asset.selected).length;
  deleteProposals(projectId, kind, true);
  return NextResponse.json({ discarded });
}

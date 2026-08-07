import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestBrandProfileFromProject, inferBrandProfileFromAssets } from "@/lib/content-studio/brand-profile";
import { contentStudioBlockedReason } from "@/lib/content-studio/gates";
import { designOnePost, planMonthOnly } from "@/lib/content-studio/generate";
import {
  getCalendarWithPosts,
  getContentProfile,
  getRawAsset,
  insertRawAsset,
  latestCalendarForProject,
  listProfilesForProject,
  listRawAssets,
  saveCalendar,
  saveContentProfile,
  updatePost,
  updateRawAssetOwnerMeta,
  upsertRawAssetByFilename,
} from "@/lib/content-studio/store";
import { normalizeMonthBrief, normalizeOwnerMeta } from "@/lib/content-studio/owner-controls-pure";
import {
  importDirectoryToProfile,
  kindFromMime,
  mimeFromFilename,
  resolveImportSourceDir,
  writeRawAssetFile,
} from "@/lib/content-studio/storage";
import { getProject } from "@/lib/queries";

export const dynamic = "force-dynamic";
/** Strategy plan + Open Design per post can exceed default serverless limits. */
export const maxDuration = 800;

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("lock-from-project"),
    projectId: z.string().min(1),
  }),
  z.object({
    action: z.literal("lock-inferred"),
    brandName: z.string().min(1).max(80),
    assets: z
      .array(
        z.object({
          filename: z.string().min(1),
          mimeType: z.string().default("application/octet-stream"),
        })
      )
      .default([]),
  }),
  /** Metadata-only registration — storagePath is server-owned (ignored if client sends one). */
  z.object({
    action: z.literal("register-asset"),
    profileId: z.string().min(1),
    filename: z.string().min(1),
    mimeType: z.string().default("application/octet-stream"),
  }),
  /** Copy files from an allowlisted server-side folder into profile storage + register DB rows. */
  z.object({
    action: z.literal("import-folder"),
    profileId: z.string().min(1),
    /** Absolute or app-relative path under data/content-studio or project raw drop folder */
    sourceDir: z.string().min(1),
  }),
  z.object({
    action: z.literal("generate-month"),
    profileId: z.string().min(1),
    year: z.number().int().min(2020).max(2100),
    month: z.number().int().min(1).max(12),
    /** Organic cadence: 2 or 3 posts per week across the real month length. */
    postsPerWeek: z.number().int().min(2).max(3).optional(),
    /** Force re-run vision analysis even if cards already exist. */
    forceReanalyze: z.boolean().optional(),
    /** P4 owner month brief */
    monthBrief: z
      .object({
        goal: z.string().max(800).optional().nullable(),
        offer: z.string().max(800).optional().nullable(),
        taboo: z.string().max(800).optional().nullable(),
        language: z.string().max(400).optional().nullable(),
        notes: z.string().max(800).optional().nullable(),
      })
      .optional()
      .nullable(),
    reusePolicy: z.enum(["rotate", "prefer-strong", "unique-first"]).optional(),
    excludeWeakFit: z.boolean().optional(),
  }),
  /** P0: run vision analysis on all stored assets (no month plan). */
  z.object({
    action: z.literal("analyze-media"),
    profileId: z.string().min(1),
    force: z.boolean().optional(),
  }),
  /** P4: update owner tags / exclude on one asset. */
  z.object({
    action: z.literal("update-asset-meta"),
    profileId: z.string().min(1),
    assetId: z.string().min(1),
    tags: z
      .array(z.enum(["hero", "bts", "product", "lifestyle", "event", "no-ads"]))
      .optional(),
    excluded: z.boolean().optional(),
    note: z.string().max(400).optional().nullable(),
  }),
  /** Open Design one calendar post (primary platform). Call after generate-month. */
  z.object({
    action: z.literal("design-post"),
    profileId: z.string().min(1),
    postId: z.string().min(1),
    calendarId: z.string().min(1),
  }),
  z.object({
    action: z.literal("update-post"),
    postId: z.string().min(1),
    caption: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    status: z.enum(["draft", "approved", "rejected"]).optional(),
    notes: z.string().nullable().optional(),
  }),
  /** Markdown export of calendar posts (optional approved-only). */
  z.object({
    action: z.literal("export-calendar"),
    profileId: z.string().min(1),
    calendarId: z.string().min(1),
    onlyApproved: z.boolean().optional(),
  }),
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const profileId = searchParams.get("profileId");
  const calendarId = searchParams.get("calendarId");

  if (calendarId) {
    const calendar = getCalendarWithPosts(calendarId);
    if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    return NextResponse.json({ calendar });
  }

  if (profileId) {
    const profile = getContentProfile(profileId);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    const assets = listRawAssets(profileId);
    return NextResponse.json({
      profile: profile.payload,
      profileId: profile.id,
      projectId: profile.project_id,
      assets,
    });
  }

  if (projectId) {
    if (!getProject(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const blocked = contentStudioBlockedReason(projectId);
    const profiles = listProfilesForProject(projectId);
    const latest = latestCalendarForProject(projectId);
    return NextResponse.json({
      unlocked: !blocked,
      blockedReason: blocked,
      profiles: profiles.map((p) => ({
        id: p.id,
        brandName: p.brand_name,
        source: p.source,
        locked: p.locked,
      })),
      calendar: latest,
    });
  }

  return NextResponse.json({
    ok: true,
    workflows: ["project", "standalone"],
    docs: "docs/12-content-studio.md",
  });
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  // Multipart upload: real file bytes → disk + DB
  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const profileId = String(form.get("profileId") || "");
      if (!profileId || !getContentProfile(profileId)) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      const profileRow = getContentProfile(profileId)!;
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const written = writeRawAssetFile({
        projectId: profileRow.project_id,
        profileId,
        filename: file.name,
        bytes: buf,
      });
      const mimeType = file.type || mimeFromFilename(written.filename);
      const asset = insertRawAsset({
        profileId,
        filename: written.filename,
        mimeType,
        kind: kindFromMime(mimeType),
        storagePath: written.storagePath,
      });
      return NextResponse.json({ asset });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  try {
    if (input.action === "lock-from-project") {
      const blocked = contentStudioBlockedReason(input.projectId);
      if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });
      const profile = ingestBrandProfileFromProject(input.projectId);
      const { id } = saveContentProfile({
        projectId: input.projectId,
        profile,
        replaceLatest: true,
      });
      return NextResponse.json({ profileId: id, profile });
    }

    if (input.action === "lock-inferred") {
      const stubs = input.assets.map((a) => ({
        filename: a.filename,
        kind: kindFromMime(a.mimeType),
      }));
      if (stubs.length === 0) {
        return NextResponse.json(
          { error: "Add at least one media file before locking an inferred profile." },
          { status: 400 }
        );
      }
      const profile = inferBrandProfileFromAssets(input.brandName, stubs);
      const { id } = saveContentProfile({ projectId: null, profile });
      return NextResponse.json({ profileId: id, profile });
    }

    if (input.action === "register-asset") {
      if (!getContentProfile(input.profileId)) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      // Never accept client-supplied storagePath (path injection). Use multipart or import-folder.
      const asset = insertRawAsset({
        profileId: input.profileId,
        filename: input.filename,
        mimeType: input.mimeType,
        kind: kindFromMime(input.mimeType),
        storagePath: null,
      });
      return NextResponse.json({ asset });
    }

    if (input.action === "import-folder") {
      const row = getContentProfile(input.profileId);
      if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      const sourceDir = resolveImportSourceDir(input.sourceDir);
      const files = importDirectoryToProfile({
        projectId: row.project_id,
        profileId: input.profileId,
        sourceDir,
      });
      if (files.length === 0) {
        return NextResponse.json(
          { error: `No media files found in ${sourceDir}` },
          { status: 400 }
        );
      }
      const assets = files.map(
        (f) =>
          upsertRawAssetByFilename({
            profileId: input.profileId,
            filename: f.filename,
            mimeType: f.mimeType,
            kind: f.kind,
            storagePath: f.storagePath,
          }).asset
      );
      const created = assets.length; // count returned rows (existing re-used)
      return NextResponse.json({
        imported: created,
        assets,
        sourceDir,
        note: "Existing filenames are de-duped (not re-inserted).",
      });
    }

    if (input.action === "update-asset-meta") {
      const row = getContentProfile(input.profileId);
      if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      const asset = getRawAsset(input.assetId);
      if (!asset || asset.profileId !== input.profileId) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      const prev = normalizeOwnerMeta(asset.ownerMeta ?? {});
      const next = normalizeOwnerMeta({
        tags: input.tags !== undefined ? input.tags : prev.tags,
        excluded: input.excluded !== undefined ? input.excluded : prev.excluded,
        note: input.note !== undefined ? input.note : prev.note,
      });
      updateRawAssetOwnerMeta(input.assetId, next);
      const refreshed = getRawAsset(input.assetId);
      return NextResponse.json({ asset: refreshed, ownerMeta: next });
    }

    if (input.action === "analyze-media") {
      const row = getContentProfile(input.profileId);
      if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      const profile = row.payload as unknown as import("@/lib/content-studio/types").BrandProfile;
      const assets = listRawAssets(input.profileId);
      const { ensureAssetsAnalyzed } = await import("@/lib/content-studio/media-analysis");
      const result = await ensureAssetsAnalyzed(assets, profile, { force: input.force });
      const { mediaPipelineStatus } = await import("@/lib/content-studio/media-analysis");
      const pipeline = await mediaPipelineStatus();
      return NextResponse.json({
        ok: true,
        analyzed: result.analyzed,
        skipped: result.skipped,
        failed: result.failed,
        pipeline,
        assets: result.assets.map((a) => ({
          id: a.id,
          filename: a.filename,
          kind: a.kind,
          analysis: a.analysis
            ? {
                status: a.analysis.status,
                summary: a.analysis.summary,
                cluster: a.analysis.cluster,
                brandFit: a.analysis.brandFit,
                subjects: a.analysis.subjects,
                contentAngles: a.analysis.contentAngles,
                doNotClaim: a.analysis.doNotClaim,
              }
            : null,
        })),
      });
    }

    if (input.action === "generate-month") {
      const row = getContentProfile(input.profileId);
      if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      let profile = row.payload as unknown as import("@/lib/content-studio/types").BrandProfile;
      // Refresh strategy context from live project when available (richer than stale payload)
      if (row.project_id && profile.source === "project") {
        try {
          const { ingestBrandProfileFromProject } = await import(
            "@/lib/content-studio/brand-profile"
          );
          const fresh = ingestBrandProfileFromProject(row.project_id);
          profile = {
            ...profile,
            strategyContext: fresh.strategyContext ?? profile.strategyContext,
            conceptStatement: profile.conceptStatement || fresh.conceptStatement,
            toneOfVoice: profile.toneOfVoice?.length ? profile.toneOfVoice : fresh.toneOfVoice,
            personalityTraits: profile.personalityTraits?.length
              ? profile.personalityTraits
              : fresh.personalityTraits,
            promise: profile.promise || fresh.promise,
          };
        } catch {
          /* keep locked payload */
        }
      }
      const assets = listRawAssets(input.profileId);
      if (input.forceReanalyze) {
        const { ensureAssetsAnalyzed } = await import("@/lib/content-studio/media-analysis");
        await ensureAssetsAnalyzed(assets, profile, { force: true });
      }
      // Strategy AI only — vision cards run inside planMonthOnly. Client then design-post.
      const { calendar } = await planMonthOnly(
        profile,
        listRawAssets(input.profileId),
        {
          year: input.year,
          month: input.month,
          postsPerWeek: input.postsPerWeek,
          monthBrief: normalizeMonthBrief(input.monthBrief ?? null),
          reusePolicy: input.reusePolicy,
          excludeWeakFit: input.excludeWeakFit,
        },
        input.profileId
      );
      const withAnalysis = listRawAssets(input.profileId).filter(
        (a) => a.analysis?.status === "ok" || a.analysis?.status === "partial"
      ).length;
      const { mediaPipelineStatus } = await import("@/lib/content-studio/media-analysis");
      const pipeline = await mediaPipelineStatus();
      return NextResponse.json({
        calendar,
        meta: {
          pipeline: "vision-media + strategy-ai + consistency-gate",
          posts: calendar.posts.length,
          postsPerWeek: calendar.strategy?.postsPerWeek ?? input.postsPerWeek ?? 3,
          mediaAnalyzedOk: withAnalysis,
          consistency: calendar.strategy?.consistency ?? null,
          ffmpeg: pipeline.ffmpeg,
          next: "design-post for each calendar post (Open Design)",
        },
      });
    }

    if (input.action === "design-post") {
      const row = getContentProfile(input.profileId);
      if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      const calendar = getCalendarWithPosts(input.calendarId);
      if (!calendar || calendar.profileId !== input.profileId) {
        return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
      }
      const post = calendar.posts.find((p) => p.id === input.postId);
      if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
      const assets = listRawAssets(input.profileId);
      const asset =
        assets.find((a) => post.sourceAssetIds.includes(a.id) && a.storagePath) ||
        assets.find((a) => a.storagePath);
      if (!asset) {
        return NextResponse.json({ error: "No stored media for this post" }, { status: 400 });
      }
      const profile = row.payload as unknown as import("@/lib/content-studio/types").BrandProfile;
      const variants = await designOnePost({
        profile,
        profileId: input.profileId,
        projectId: row.project_id,
        post,
        asset,
      });
      updatePost(post.id, { variants });
      const designedCount = calendar.posts.filter((p) =>
        p.id === post.id
          ? variants.some((v) => v.previewUri)
          : p.variants.some((v) => v.previewUri)
      ).length;
      // Mark calendar ready when all posts have at least one design attempt stored
      const refreshed = getCalendarWithPosts(input.calendarId);
      if (refreshed) {
        const allTried = refreshed.posts.every(
          (p) => p.variants.some((v) => v.previewUri) || p.id === post.id
        );
        if (allTried && refreshed.status !== "ready") {
          saveCalendar({ ...refreshed, status: "ready" });
        }
      }
      return NextResponse.json({
        postId: post.id,
        variants,
        designedCount,
      });
    }

    if (input.action === "update-post") {
      updatePost(input.postId, {
        caption: input.caption,
        hashtags: input.hashtags,
        status: input.status,
        notes: input.notes,
      });
      return NextResponse.json({ ok: true });
    }

    if (input.action === "export-calendar") {
      if (!getContentProfile(input.profileId)) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      const { exportCalendarForProfile } = await import("@/lib/content-studio/export");
      const bundle = exportCalendarForProfile(input.profileId, input.calendarId, {
        onlyApproved: input.onlyApproved,
      });
      return new NextResponse(bundle.body, {
        status: 200,
        headers: {
          "Content-Type": bundle.mimeType,
          "Content-Disposition": `attachment; filename="${bundle.filename.replace(/"/g, "")}"`,
        },
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Content Studio action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

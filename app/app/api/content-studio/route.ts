import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestBrandProfileFromProject, inferBrandProfileFromAssets } from "@/lib/content-studio/brand-profile";
import { contentStudioBlockedReason } from "@/lib/content-studio/gates";
import { generateMonth } from "@/lib/content-studio/generate";
import {
  getCalendarWithPosts,
  getContentProfile,
  insertRawAsset,
  latestCalendarForProject,
  listProfilesForProject,
  listRawAssets,
  saveCalendar,
  saveContentProfile,
  updatePost,
  upsertRawAssetByFilename,
} from "@/lib/content-studio/store";
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
    postsPerWeek: z.number().int().min(1).max(14).optional(),
  }),
  z.object({
    action: z.literal("update-post"),
    postId: z.string().min(1),
    caption: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    status: z.enum(["draft", "approved", "rejected"]).optional(),
    notes: z.string().nullable().optional(),
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

    if (input.action === "generate-month") {
      const row = getContentProfile(input.profileId);
      if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      const profile = row.payload as unknown as import("@/lib/content-studio/types").BrandProfile;
      const assets = listRawAssets(input.profileId);
      // Strategy AI (copy/hashtags/channels/dimensions) + Open Design (visuals from user media)
      const calendar = await generateMonth(
        profile,
        assets,
        {
          year: input.year,
          month: input.month,
          postsPerWeek: input.postsPerWeek,
        },
        input.profileId,
        { projectId: row.project_id }
      );
      saveCalendar(calendar);
      return NextResponse.json({
        calendar,
        meta: {
          pipeline: "strategy-ai + open-design",
          posts: calendar.posts.length,
          designs: calendar.posts.filter((p) =>
            p.variants.some((v) => Boolean(v.previewUri))
          ).length,
        },
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

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Content Studio action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

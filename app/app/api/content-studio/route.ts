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
} from "@/lib/content-studio/store";
import { getProject } from "@/lib/queries";

export const dynamic = "force-dynamic";

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("lock-from-project"),
    projectId: z.string().min(1),
  }),
  z.object({
    action: z.literal("lock-inferred"),
    brandName: z.string().min(1).max(80),
    // Client lists filenames after upload placeholder — real upload comes later
    assets: z
      .array(
        z.object({
          filename: z.string().min(1),
          mimeType: z.string().default("application/octet-stream"),
        })
      )
      .default([]),
  }),
  z.object({
    action: z.literal("register-asset"),
    profileId: z.string().min(1),
    filename: z.string().min(1),
    mimeType: z.string().default("application/octet-stream"),
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

function mimeKind(mime: string): "image" | "video" | "unknown" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "unknown";
}

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
      const { id } = saveContentProfile({ projectId: input.projectId, profile });
      return NextResponse.json({ profileId: id, profile });
    }

    if (input.action === "lock-inferred") {
      const stubs = input.assets.map((a) => ({
        filename: a.filename,
        kind: mimeKind(a.mimeType),
      }));
      const profile = inferBrandProfileFromAssets(input.brandName, stubs);
      const { id } = saveContentProfile({ projectId: null, profile });
      for (const a of input.assets) {
        insertRawAsset({
          profileId: id,
          filename: a.filename,
          mimeType: a.mimeType,
          kind: mimeKind(a.mimeType),
        });
      }
      return NextResponse.json({ profileId: id, profile });
    }

    if (input.action === "register-asset") {
      if (!getContentProfile(input.profileId)) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      const asset = insertRawAsset({
        profileId: input.profileId,
        filename: input.filename,
        mimeType: input.mimeType,
        kind: mimeKind(input.mimeType),
        storagePath: null, // real upload storage later
      });
      return NextResponse.json({ asset });
    }

    if (input.action === "generate-month") {
      const row = getContentProfile(input.profileId);
      if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      const profile = row.payload as unknown as import("@/lib/content-studio/types").BrandProfile;
      const assets = listRawAssets(input.profileId);
      const calendar = generateMonth(
        profile,
        assets,
        {
          year: input.year,
          month: input.month,
          postsPerWeek: input.postsPerWeek,
        },
        input.profileId
      );
      saveCalendar(calendar);
      return NextResponse.json({ calendar });
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

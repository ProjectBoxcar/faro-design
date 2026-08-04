/**
 * SQLite persistence for Content Studio (scaffold).
 * Uses the same better-sqlite3/drizzle connection as the rest of the app.
 */
import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  content_calendars,
  content_posts,
  content_profiles,
  content_raw_assets,
} from "@/lib/db/schema";
import type {
  BrandProfile,
  ContentCalendar,
  ContentPlatform,
  ContentPost,
  ContentPostStatus,
  ContentRawAsset,
  PlatformVariant,
} from "@/lib/content-studio/types";

export function saveContentProfile(input: {
  projectId: string | null;
  profile: BrandProfile;
  /** When true and projectId set, reuse the latest profile row for that project. */
  replaceLatest?: boolean;
}): { id: string } {
  if (input.replaceLatest && input.projectId) {
    const existing = listProfilesForProject(input.projectId)[0];
    if (existing) {
      db.update(content_profiles)
        .set({
          source: input.profile.source,
          brand_name: input.profile.brandName,
          locked: input.profile.locked,
          payload: input.profile,
        })
        .where(eq(content_profiles.id, existing.id))
        .run();
      return { id: existing.id };
    }
  }
  const id = nanoid();
  db.insert(content_profiles)
    .values({
      id,
      project_id: input.projectId,
      source: input.profile.source,
      brand_name: input.profile.brandName,
      locked: input.profile.locked,
      payload: input.profile,
    })
    .run();
  return { id };
}

export function getContentProfile(id: string) {
  return db.select().from(content_profiles).where(eq(content_profiles.id, id)).get();
}

export function listProfilesForProject(projectId: string) {
  return db
    .select()
    .from(content_profiles)
    .where(eq(content_profiles.project_id, projectId))
    .orderBy(desc(content_profiles.created_at))
    .all();
}

export function insertRawAsset(input: {
  profileId: string;
  filename: string;
  mimeType: string;
  kind: "image" | "video" | "unknown";
  storagePath?: string | null;
}): ContentRawAsset {
  const id = nanoid();
  const created = new Date();
  db.insert(content_raw_assets)
    .values({
      id,
      profile_id: input.profileId,
      filename: input.filename,
      mime_type: input.mimeType,
      kind: input.kind,
      storage_path: input.storagePath ?? null,
    })
    .run();
  return {
    id,
    profileId: input.profileId,
    filename: input.filename,
    mimeType: input.mimeType,
    kind: input.kind,
    storagePath: input.storagePath ?? null,
    createdAt: created.toISOString(),
  };
}

export function listRawAssets(profileId: string): ContentRawAsset[] {
  return db
    .select()
    .from(content_raw_assets)
    .where(eq(content_raw_assets.profile_id, profileId))
    .orderBy(desc(content_raw_assets.created_at))
    .all()
    .map((r) => ({
      id: r.id,
      profileId: r.profile_id,
      filename: r.filename,
      mimeType: r.mime_type,
      kind: r.kind as ContentRawAsset["kind"],
      storagePath: r.storage_path,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
}

export function saveCalendar(calendar: ContentCalendar): void {
  // Replace existing calendar for same profile + year + month (idempotent regenerate).
  const prior = db
    .select()
    .from(content_calendars)
    .where(eq(content_calendars.profile_id, calendar.profileId))
    .all()
    .filter((c) => c.year === calendar.year && c.month === calendar.month);
  for (const old of prior) {
    db.delete(content_posts).where(eq(content_posts.calendar_id, old.id)).run();
    db.delete(content_calendars).where(eq(content_calendars.id, old.id)).run();
  }

  db.insert(content_calendars)
    .values({
      id: calendar.id,
      profile_id: calendar.profileId,
      year: calendar.year,
      month: calendar.month,
      status: calendar.status,
    })
    .run();

  for (const p of calendar.posts) {
    db.insert(content_posts)
      .values({
        id: p.id,
        calendar_id: calendar.id,
        day_index: p.dayIndex,
        date_iso: p.dateIso,
        platforms: p.platforms,
        caption: p.caption,
        hashtags: p.hashtags,
        variants: p.variants,
        source_asset_ids: p.sourceAssetIds,
        status: p.status,
        notes: p.notes,
      })
      .run();
  }
}

export function getCalendarWithPosts(calendarId: string): ContentCalendar | null {
  const cal = db
    .select()
    .from(content_calendars)
    .where(eq(content_calendars.id, calendarId))
    .get();
  if (!cal) return null;
  const posts = db
    .select()
    .from(content_posts)
    .where(eq(content_posts.calendar_id, calendarId))
    .orderBy(asc(content_posts.day_index))
    .all()
    .map(
      (p): ContentPost => ({
        id: p.id,
        calendarId: p.calendar_id,
        dayIndex: p.day_index,
        dateIso: p.date_iso,
        platforms: (p.platforms ?? []) as ContentPlatform[],
        caption: p.caption,
        hashtags: (p.hashtags ?? []) as string[],
        variants: (p.variants ?? []) as PlatformVariant[],
        sourceAssetIds: (p.source_asset_ids ?? []) as string[],
        status: p.status as ContentPostStatus,
        notes: p.notes,
      })
    );
  return {
    id: cal.id,
    profileId: cal.profile_id,
    year: cal.year,
    month: cal.month,
    status: cal.status as ContentCalendar["status"],
    posts,
  };
}

export function listCalendarsForProfile(profileId: string) {
  return db
    .select()
    .from(content_calendars)
    .where(eq(content_calendars.profile_id, profileId))
    .orderBy(desc(content_calendars.created_at))
    .all();
}

export function updatePost(
  postId: string,
  patch: Partial<Pick<ContentPost, "caption" | "hashtags" | "status" | "notes">>
): void {
  const row = db.select().from(content_posts).where(eq(content_posts.id, postId)).get();
  if (!row) throw new Error("Post not found");
  db.update(content_posts)
    .set({
      caption: patch.caption ?? row.caption,
      hashtags: patch.hashtags ?? row.hashtags,
      status: patch.status ?? row.status,
      notes: patch.notes !== undefined ? patch.notes : row.notes,
      updated_at: new Date(),
    })
    .where(eq(content_posts.id, postId))
    .run();
}

export function latestCalendarForProject(projectId: string): ContentCalendar | null {
  const profile = listProfilesForProject(projectId)[0];
  if (!profile) return null;
  const cal = listCalendarsForProfile(profile.id)[0];
  if (!cal) return null;
  return getCalendarWithPosts(cal.id);
}

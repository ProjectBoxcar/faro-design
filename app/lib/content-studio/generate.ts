/**
 * Content generation façade (TypeScript placeholders).
 * Same engine contract as services/content-studio/content_studio/engine.py.
 * Wire real model APIs later — keep decoupled from brand ingestion.
 */
import { nanoid } from "nanoid";
import type {
  BrandProfile,
  ContentCalendar,
  ContentPlatform,
  ContentPost,
  ContentRawAsset,
  GenerateMonthOptions,
  PlatformVariant,
} from "@/lib/content-studio/types";

const DEFAULT_PLATFORMS: ContentPlatform[] = ["instagram", "tiktok", "linkedin"];

function variantRecipe(platform: ContentPlatform): PlatformVariant {
  const map: Record<ContentPlatform, { aspectRatio: string; cropHint: string }> = {
    instagram: { aspectRatio: "1:1", cropHint: "Centered square safe zone" },
    tiktok: { aspectRatio: "9:16", cropHint: "Vertical; subject in upper two-thirds" },
    linkedin: { aspectRatio: "1.91:1", cropHint: "Landscape; margin for UI chrome" },
  };
  const r = map[platform];
  return {
    platform,
    aspectRatio: r.aspectRatio,
    cropHint: r.cropHint,
    previewUri: null,
  };
}

/** PLACEHOLDER caption model */
export function generateCaption(
  profile: BrandProfile,
  dayIndex: number,
  asset: ContentRawAsset | null
): string {
  const voice = profile.toneOfVoice.slice(0, 3).join(", ") || "clear and human";
  const concept = profile.conceptStatement || "what we stand for";
  const media = asset?.filename ?? "this moment";
  return (
    `${profile.brandName} — day ${dayIndex}. ` +
    `Speaking in a ${voice} voice about ${concept}. ` +
    `(Placeholder caption for ${media}.)`
  );
}

/** PLACEHOLDER hashtag model */
export function generateHashtags(profile: BrandProfile): string[] {
  const base = profile.brandName.replace(/\s+/g, "").toLowerCase() || "brand";
  const tags = [`#${base}`, "#brand", "#content"];
  for (const t of profile.personalityTraits.slice(0, 2)) {
    tags.push("#" + t.replace(/[^a-zA-Z0-9]/g, "").toLowerCase());
  }
  return tags.slice(0, 8);
}

/** PLACEHOLDER crop / transform API */
export function generatePlatformVariants(
  platforms: ContentPlatform[]
): PlatformVariant[] {
  return platforms.map(variantRecipe);
}

/**
 * Shared generation engine — Workflow A and B both call this after profile lock.
 */
export function generateMonth(
  profile: BrandProfile,
  assets: ContentRawAsset[],
  options: GenerateMonthOptions,
  profileId: string
): ContentCalendar {
  if (!profile.locked) {
    throw new Error("Brand profile must be locked before generating content.");
  }
  const withFiles = assets.filter((a) => Boolean(a.storagePath));
  if (withFiles.length === 0) {
    throw new Error(
      "Add at least one stored photo or video before generating a month (files must be saved on disk)."
    );
  }
  const platforms = options.platforms?.length ? options.platforms : DEFAULT_PLATFORMS;
  const postsPerWeek = options.postsPerWeek ?? 4;
  const total = Math.max(1, postsPerWeek * 4);
  const calendarId = nanoid();
  const posts: ContentPost[] = [];

  for (let i = 1; i <= total; i++) {
    const day = Math.min(28, 1 + Math.floor(((i - 1) * 28) / total));
    const dateIso = `${options.year}-${String(options.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const asset = withFiles[(i - 1) % withFiles.length] ?? null;
    const caption = generateCaption(profile, i, asset);
    posts.push({
      id: nanoid(),
      calendarId,
      dayIndex: i,
      dateIso,
      platforms: [...platforms],
      caption,
      hashtags: generateHashtags(profile),
      variants: generatePlatformVariants(platforms),
      sourceAssetIds: asset ? [asset.id] : [],
      status: "draft",
      notes: null,
    });
  }

  return {
    id: calendarId,
    profileId,
    year: options.year,
    month: options.month,
    status: "ready",
    posts,
  };
}

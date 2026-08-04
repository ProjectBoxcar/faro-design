/**
 * Content generation engine — Workflow A and B.
 * Creative/technical: Strategy AI (Anthropic / strategy provider) → copy, hashtags, channels, dimensions.
 * Visuals: Open Design daemon → HTML post designs from user media + locked brand.
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
// saveCalendar / updatePost loaded dynamically in generateMonth to keep pure helpers free of store cycles

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

/** @deprecated Placeholders — tests only. Production uses generateMonth (AI + OD). */
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

/** @deprecated Placeholders — tests only. */
export function generateHashtags(profile: BrandProfile): string[] {
  const base = profile.brandName.replace(/\s+/g, "").toLowerCase() || "brand";
  const tags = [`#${base}`, "#brand", "#content"];
  for (const t of profile.personalityTraits.slice(0, 2)) {
    tags.push("#" + t.replace(/[^a-zA-Z0-9]/g, "").toLowerCase());
  }
  return tags.slice(0, 8);
}

export function generatePlatformVariants(platforms: ContentPlatform[]): PlatformVariant[] {
  return platforms.map(variantRecipe);
}

/**
 * Sync placeholder path — unit tests and offline smoke only.
 * Prefer generateMonth for real production output.
 */
export function generateMonthPlaceholder(
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
  const postsPerWeek = Math.min(3, Math.max(2, options.postsPerWeek ?? 3));
  const dim = new Date(options.year, options.month, 0).getDate();
  const total = Math.min(dim, Math.max(postsPerWeek * 4, Math.round((postsPerWeek * dim) / 7)));
  const calendarId = nanoid();
  const posts: ContentPost[] = [];

  for (let i = 1; i <= total; i++) {
    const day = Math.min(28, 1 + Math.floor(((i - 1) * 28) / total));
    const dateIso = `${options.year}-${String(options.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const asset = withFiles[(i - 1) % withFiles.length] ?? null;
    posts.push({
      id: nanoid(),
      calendarId,
      dayIndex: i,
      dateIso,
      platforms: [...platforms],
      caption: generateCaption(profile, i, asset),
      hashtags: generateHashtags(profile),
      variants: generatePlatformVariants(platforms),
      sourceAssetIds: asset ? [asset.id] : [],
      status: "draft",
      notes: "placeholder",
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

export type PlanMonthResult = {
  calendar: ContentCalendar;
  /** Parallel plan rows for OD (same order as posts) */
  planSnapshots: {
    postId: string;
    sourceAssetId: string;
    platforms: ContentPlatform[];
    theme: string;
    hook: string;
    caption: string;
    hashtags: string[];
    creativeDirection: string;
    channelRationale: string;
    dimensions: { platform: ContentPlatform; aspectRatio: string; cropHint: string; pixelSize: string }[];
  }[];
};

/**
 * Phase 1 — Strategy AI only: full month strategy + all posts (2–3×/week).
 * No Open Design yet (keeps the request short / reliable).
 */
export async function planMonthOnly(
  profile: BrandProfile,
  assets: ContentRawAsset[],
  options: GenerateMonthOptions,
  profileId: string
): Promise<PlanMonthResult> {
  if (!profile.locked) {
    throw new Error("Brand profile must be locked before generating content.");
  }
  const withFiles = assets.filter((a) => Boolean(a.storagePath));
  if (withFiles.length === 0) {
    throw new Error(
      "Add at least one stored photo or video before generating a month (files must be saved on disk)."
    );
  }

  const { planOrganicMonth } = await import("@/lib/content-studio/ai-plan");
  const optionsResolved = {
    ...options,
    postsPerWeek: Math.min(3, Math.max(2, options.postsPerWeek ?? 3)),
  };

  const plan = await planOrganicMonth(profile, withFiles, optionsResolved);
  const calendarId = nanoid();
  const planSnapshots: PlanMonthResult["planSnapshots"] = [];

  const posts: ContentPost[] = plan.posts.map((planned) => {
    const asset = withFiles[planned.sourceAssetIndex % withFiles.length]!;
    const postId = nanoid();
    const notes = [
      planned.pillar ? `Pillar: ${planned.pillar}` : null,
      `Theme: ${planned.theme}`,
      planned.hook ? `Hook: ${planned.hook}` : null,
      planned.creativeDirection ? `Art direction: ${planned.creativeDirection}` : null,
      planned.channelRationale ? `Channels: ${planned.channelRationale}` : null,
      `Month theme: ${plan.strategy.monthlyTheme}`,
      `Cadence: ${plan.strategy.cadenceLabel}`,
      `Media: ${asset.filename}`,
      `Plan engine: ${plan.engine} · ${plan.model}`,
    ]
      .filter(Boolean)
      .join("\n");

    const variants: PlatformVariant[] = planned.platforms.map((platform) => {
      const d =
        planned.dimensions.find((x) => x.platform === platform) ||
        planned.dimensions[0];
      return {
        platform,
        aspectRatio:
          d?.aspectRatio ||
          (platform === "tiktok" ? "9:16" : platform === "linkedin" ? "1.91:1" : "4:5"),
        cropHint: d ? `${d.cropHint} · ${d.pixelSize}` : "pending design",
        previewUri: null,
      };
    });

    planSnapshots.push({
      postId,
      sourceAssetId: asset.id,
      platforms: planned.platforms,
      theme: planned.theme,
      hook: planned.hook,
      caption: planned.caption,
      hashtags: planned.hashtags,
      creativeDirection: planned.creativeDirection,
      channelRationale: planned.channelRationale,
      dimensions: planned.dimensions,
    });

    return {
      id: postId,
      calendarId,
      dayIndex: planned.dayIndex,
      dateIso: planned.dateIso,
      platforms: planned.platforms,
      caption: planned.caption,
      hashtags: planned.hashtags,
      variants,
      sourceAssetIds: [asset.id],
      status: "draft" as const,
      notes,
    };
  });

  const calendar: ContentCalendar = {
    id: calendarId,
    profileId,
    year: optionsResolved.year,
    month: optionsResolved.month,
    status: "generating",
    posts,
    strategy: plan.strategy,
  };

  const { saveCalendar } = await import("@/lib/content-studio/store");
  saveCalendar(calendar);

  return { calendar, planSnapshots };
}

/**
 * Phase 2 — Open Design one post (primary platform) using locked brand + source media.
 */
export async function designOnePost(opts: {
  profile: BrandProfile;
  profileId: string;
  projectId: string | null;
  post: ContentPost;
  asset: ContentRawAsset;
}): Promise<PlatformVariant[]> {
  const { designPlannedPost } = await import("@/lib/content-studio/od-designs");
  const primary = opts.post.platforms[0] || "instagram";
  const dimHint = opts.post.variants.find((v) => v.platform === primary);

  const planned = {
    dayIndex: opts.post.dayIndex,
    dateIso: opts.post.dateIso,
    platforms: opts.post.platforms,
    caption: opts.post.caption,
    hashtags: opts.post.hashtags,
    theme: opts.post.notes?.match(/Theme: (.+)/)?.[1] || "organic",
    hook: opts.post.notes?.match(/Hook: (.+)/)?.[1] || opts.post.caption.split("\n")[0] || "",
    creativeDirection:
      opts.post.notes?.match(/Art direction: (.+)/)?.[1] ||
      "Use source media with brand palette and strong contrast.",
    channelRationale: opts.post.notes?.match(/Channels: (.+)/)?.[1] || "",
    dimensions: opts.post.platforms.map((platform) => {
      const v = opts.post.variants.find((x) => x.platform === platform);
      const pixel =
        platform === "tiktok"
          ? "1080x1920"
          : platform === "linkedin"
            ? "1200x627"
            : "1080x1350";
      return {
        platform,
        aspectRatio: v?.aspectRatio || dimHint?.aspectRatio || "4:5",
        cropHint: v?.cropHint || "Brand-safe crop",
        pixelSize: pixel,
      };
    }),
    sourceAssetIndex: 0,
  };

  const designed = await designPlannedPost({
    profile: opts.profile,
    profileId: opts.profileId,
    projectId: opts.projectId,
    planned,
    asset: opts.asset,
    postId: opts.post.id,
    designAllPlatforms: false,
  });

  return designed.map((v) => ({
    platform: v.platform,
    aspectRatio: v.aspectRatio,
    cropHint: v.cropHint,
    previewUri: v.previewUri,
  }));
}

/**
 * Full pipeline: plan month, then OD each post. Prefer client-orchestrated plan + design-post
 * for long months; this remains for scripts that can wait.
 */
export async function generateMonth(
  profile: BrandProfile,
  assets: ContentRawAsset[],
  options: GenerateMonthOptions,
  profileId: string,
  meta?: { projectId?: string | null }
): Promise<ContentCalendar> {
  const { calendar } = await planMonthOnly(profile, assets, options, profileId);
  const projectId = meta?.projectId ?? profile.projectId ?? null;
  const withFiles = assets.filter((a) => Boolean(a.storagePath));
  const { updatePost, saveCalendar, getCalendarWithPosts } = await import(
    "@/lib/content-studio/store"
  );

  for (const post of calendar.posts) {
    const assetId = post.sourceAssetIds[0];
    const asset = withFiles.find((a) => a.id === assetId) || withFiles[0];
    if (!asset) continue;
    try {
      const variants = await designOnePost({
        profile,
        profileId,
        projectId,
        post,
        asset,
      });
      post.variants = variants;
      updatePost(post.id, { variants });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[content-studio] OD skipped post ${post.id}:`, msg);
    }
  }

  calendar.status = "ready";
  saveCalendar({ ...calendar, status: "ready" });
  return getCalendarWithPosts(calendar.id) || calendar;
}

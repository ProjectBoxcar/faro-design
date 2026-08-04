/**
 * Organic monthly content plan — Strategy lane (Anthropic / configured strategy provider).
 * Produces channels, copy, hashtags, dimensions, creative direction.
 * Does NOT invent brand identity; consumes locked BrandProfile.
 */
import "server-only";
import { generateStrategyText, MODELS } from "@/lib/ai";
import { extractJson } from "@/lib/json";
import type {
  BrandProfile,
  ContentPlatform,
  ContentRawAsset,
  GenerateMonthOptions,
} from "@/lib/content-studio/types";

const ALL_PLATFORMS: ContentPlatform[] = ["instagram", "tiktok", "linkedin"];

export type PlannedDimension = {
  platform: ContentPlatform;
  aspectRatio: string;
  cropHint: string;
  /** e.g. 1080x1080 */
  pixelSize: string;
};

export type PlannedPost = {
  dayIndex: number;
  dateIso: string;
  platforms: ContentPlatform[];
  caption: string;
  hashtags: string[];
  theme: string;
  hook: string;
  creativeDirection: string;
  channelRationale: string;
  dimensions: PlannedDimension[];
  /** Index into stored assets array (0-based). */
  sourceAssetIndex: number;
};

export type MonthPlanResult = {
  posts: PlannedPost[];
  monthlyTheme: string;
  engine: string;
  model: string;
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Canonical sizes — Open Design enforces these; plan should match. */
function defaultDimensions(platforms: ContentPlatform[]): PlannedDimension[] {
  const map: Record<ContentPlatform, PlannedDimension> = {
    instagram: {
      platform: "instagram",
      aspectRatio: "4:5",
      cropHint: "Portrait feed 1080×1350; center third; 80px safe margin",
      pixelSize: "1080x1350",
    },
    tiktok: {
      platform: "tiktok",
      aspectRatio: "9:16",
      cropHint: "Full vertical 1080×1920; keep type above lower 250px chrome",
      pixelSize: "1080x1920",
    },
    linkedin: {
      platform: "linkedin",
      aspectRatio: "1.91:1",
      cropHint: "Landscape 1200×627; type readable at half scale",
      pixelSize: "1200x627",
    },
  };
  return platforms.map((p) => map[p] ?? map.instagram);
}

function coercePlatform(p: unknown): ContentPlatform | null {
  const s = String(p || "").toLowerCase();
  if (s === "instagram" || s === "tiktok" || s === "linkedin") return s;
  if (s === "ig") return "instagram";
  if (s === "tt") return "tiktok";
  if (s === "li" || s === "in") return "linkedin";
  return null;
}

function normalizeHashtags(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw.map(String)
    : typeof raw === "string"
      ? raw.split(/[\s,]+/)
      : [];
  const out: string[] = [];
  for (const t of list) {
    const clean = t.trim().replace(/^#/, "");
    if (!clean) continue;
    const tag = `#${clean.replace(/[^a-zA-Z0-9_]/g, "")}`;
    if (tag.length > 1 && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, 12);
}

/**
 * Ask Strategy AI for a full organic month plan grounded in brand + available media.
 */
export async function planOrganicMonth(
  profile: BrandProfile,
  assets: ContentRawAsset[],
  options: GenerateMonthOptions
): Promise<MonthPlanResult> {
  const withFiles = assets.filter((a) => Boolean(a.storagePath));
  if (withFiles.length === 0) {
    throw new Error("Need stored media before planning a month.");
  }
  if (!profile.locked) {
    throw new Error("Brand profile must be locked before planning content.");
  }

  const platforms =
    options.platforms?.length ? options.platforms : ALL_PLATFORMS;
  const postsPerWeek = options.postsPerWeek ?? 4;
  const total = Math.max(1, Math.min(28, postsPerWeek * 4));
  const dim = daysInMonth(options.year, options.month);
  const monthName = new Date(options.year, options.month - 1, 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const mediaList = withFiles
    .map(
      (a, i) =>
        `  [${i}] ${a.filename} (${a.kind}, ${a.mimeType})`
    )
    .join("\n");

  const palette =
    profile.palette?.map((c) => `${c.name}:${c.hex}`).join(", ") || "brand palette from design system";

  const system = `You are a senior social content strategist and copywriter for organic brand content.
You plan REAL monthly calendars — not filler placeholders.

Rules:
- Consume the locked brand only. Do NOT invent a new brand name, logo, or visual system.
- Write organic, human captions suited to each channel (not ads, not corporate fluff).
- Match tone of voice and personality from the brand profile.
- Assign real channels from: instagram, tiktok, linkedin (subset per post is OK).
- Use these exact dimensions only:
  instagram = 4:5 / 1080x1350, tiktok = 9:16 / 1080x1920, linkedin = 1.91:1 / 1200x627.
- Specify crop guidance per channel; do not invent other pixel sizes.
- Use only the provided media indices (0..n-1). Rotate assets thoughtfully across the month.
- Mix content roles: story, value, behind-the-scenes, proof, education, soft CTA — organic cadence.
- Hashtags: 4–8 relevant, mix brand + discovery; no spam.
- Captions: platform-aware length; include a hook in the first line.
- Output ONLY valid JSON matching the schema. No markdown fences.`;

  const user = `Plan ${total} organic posts for ${monthName} (${options.year}-${String(options.month).padStart(2, "0")}).

BRAND (locked — do not reinvent):
- Name: ${profile.brandName}
- Concept: ${profile.conceptStatement || "n/a"}
- Tone of voice: ${profile.toneOfVoice.join(", ") || "n/a"}
- Personality: ${profile.personalityTraits.join(", ") || "n/a"}
- Promise: ${profile.promise || "n/a"}
- Palette: ${palette}

MEDIA LIBRARY (use sourceAssetIndex 0..${withFiles.length - 1}):
${mediaList}

DEFAULT CHANNELS AVAILABLE: ${platforms.join(", ")}
POSTS WANTED: ${total} (about ${postsPerWeek}/week)
MONTH HAS ${dim} DAYS — spread dateIso across the month (YYYY-MM-DD).

JSON schema:
{
  "monthlyTheme": "string — one line seasonal/organic theme",
  "posts": [
    {
      "dayIndex": 1,
      "dateIso": "YYYY-MM-DD",
      "platforms": ["instagram"],
      "caption": "full post copy with hook",
      "hashtags": ["#tag1", "#tag2"],
      "theme": "short post theme",
      "hook": "first-line hook",
      "creativeDirection": "how the visual should look using the photo/video",
      "channelRationale": "why these channels",
      "sourceAssetIndex": 0,
      "dimensions": [
        {
          "platform": "instagram",
          "aspectRatio": "1:1",
          "cropHint": "…",
          "pixelSize": "1080x1080"
        }
      ]
    }
  ]
}

Return exactly ${total} posts in posts[].`;

  const result = await generateStrategyText({
    model: MODELS.reasoning,
    maxTokens: 8192,
    system,
    messages: [{ role: "user", content: user }],
  });

  const parsed = extractJson(result.text) as {
    monthlyTheme?: string;
    posts?: Record<string, unknown>[];
  };

  const rawPosts = Array.isArray(parsed.posts) ? parsed.posts : [];
  if (rawPosts.length === 0) {
    throw new Error("Strategy AI returned no posts for the month plan.");
  }

  const posts: PlannedPost[] = rawPosts.slice(0, total).map((raw, i) => {
    const dayIndex = Number(raw.dayIndex) || i + 1;
    let dateIso = String(raw.dateIso || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      const day = Math.min(dim, Math.max(1, 1 + Math.floor((i * dim) / total)));
      dateIso = `${options.year}-${String(options.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    const plats = (Array.isArray(raw.platforms) ? raw.platforms : platforms)
      .map(coercePlatform)
      .filter((p): p is ContentPlatform => Boolean(p));
    const postPlatforms = plats.length ? [...new Set(plats)] : [...platforms];

    let sourceAssetIndex = Number(raw.sourceAssetIndex);
    if (!Number.isFinite(sourceAssetIndex) || sourceAssetIndex < 0) {
      sourceAssetIndex = i % withFiles.length;
    }
    sourceAssetIndex = sourceAssetIndex % withFiles.length;

    const dimsRaw = Array.isArray(raw.dimensions) ? raw.dimensions : [];
    let dimensions: PlannedDimension[] = dimsRaw
      .map((d) => {
        const o = d as Record<string, unknown>;
        const platform = coercePlatform(o.platform);
        if (!platform) return null;
        return {
          platform,
          aspectRatio: String(o.aspectRatio || "1:1"),
          cropHint: String(o.cropHint || "Safe zone crop"),
          pixelSize: String(o.pixelSize || "1080x1080"),
        };
      })
      .filter((d): d is PlannedDimension => Boolean(d));

    if (dimensions.length === 0) {
      dimensions = defaultDimensions(postPlatforms);
    } else {
      // Ensure every platform on the post has a dimension row
      for (const p of postPlatforms) {
        if (!dimensions.some((d) => d.platform === p)) {
          dimensions.push(...defaultDimensions([p]));
        }
      }
    }

    const caption = String(raw.caption || raw.hook || "").trim();
    if (!caption) {
      throw new Error(`Strategy AI left post ${dayIndex} without caption.`);
    }

    return {
      dayIndex,
      dateIso,
      platforms: postPlatforms,
      caption,
      hashtags: normalizeHashtags(raw.hashtags),
      theme: String(raw.theme || "organic").slice(0, 120),
      hook: String(raw.hook || caption.split("\n")[0] || "").slice(0, 200),
      creativeDirection: String(raw.creativeDirection || "Use source media with brand palette.").slice(
        0,
        500
      ),
      channelRationale: String(raw.channelRationale || "").slice(0, 300),
      dimensions,
      sourceAssetIndex,
    };
  });

  // Pad if model under-delivered
  while (posts.length < total) {
    const i = posts.length;
    const day = Math.min(dim, Math.max(1, 1 + Math.floor((i * dim) / total)));
    const base = posts[i % Math.max(1, posts.length)];
    posts.push({
      ...base,
      dayIndex: i + 1,
      dateIso: `${options.year}-${String(options.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      sourceAssetIndex: i % withFiles.length,
      caption: base.caption,
    });
  }

  return {
    posts: posts.slice(0, total),
    monthlyTheme: String(parsed.monthlyTheme || `${profile.brandName} · ${monthName}`),
    engine: result.engine || "strategy-direct",
    model: result.model,
  };
}

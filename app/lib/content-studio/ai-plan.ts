/**
 * Organic monthly content plan — Strategy lane (Anthropic / configured strategy provider).
 * Produces content strategy + full calendar at 2–3 posts/week across the real month length.
 * Does NOT invent brand identity; consumes locked BrandProfile.
 */
import "server-only";
import { generateStrategyText, MODELS } from "@/lib/ai";
import { extractJson } from "@/lib/json";
import type {
  BrandProfile,
  ContentMonthStrategy,
  ContentPlatform,
  ContentRawAsset,
  GenerateMonthOptions,
} from "@/lib/content-studio/types";

const ALL_PLATFORMS: ContentPlatform[] = ["instagram", "tiktok", "linkedin"];

export type PlannedDimension = {
  platform: ContentPlatform;
  aspectRatio: string;
  cropHint: string;
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
  pillar?: string;
  dimensions: PlannedDimension[];
  sourceAssetIndex: number;
};

export type MonthPlanResult = {
  posts: PlannedPost[];
  strategy: ContentMonthStrategy;
  engine: string;
  model: string;
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Organic cadence: 2 or 3 posts/week across real month length (not a fixed 4-week stub). */
export function targetPostCount(year: number, month: number, postsPerWeek: number): number {
  const ppw = Math.min(3, Math.max(2, Math.round(postsPerWeek)));
  const dim = daysInMonth(year, month);
  // e.g. Aug 31 days · 3/wk → ~13; 2/wk → ~9
  const n = Math.round((ppw * dim) / 7);
  return Math.min(dim, Math.max(ppw * 4, n));
}

/**
 * Prefer mid-week organic days: Tue/Thu/Sat for 3×, Tue/Fri for 2×.
 * Spread evenly across the full month.
 */
export function suggestPostDates(
  year: number,
  month: number,
  total: number,
  postsPerWeek: number
): string[] {
  const dim = daysInMonth(year, month);
  const prefer =
    postsPerWeek <= 2
      ? [2, 5] // Tue, Fri (0=Sun)
      : [2, 4, 6]; // Tue, Thu, Sat

  const candidates: number[] = [];
  for (let d = 1; d <= dim; d++) {
    const wd = new Date(year, month - 1, d).getDay();
    if (prefer.includes(wd)) candidates.push(d);
  }
  // If not enough preferred days, fill remaining weekdays then any day
  if (candidates.length < total) {
    for (let d = 1; d <= dim; d++) {
      if (!candidates.includes(d)) {
        const wd = new Date(year, month - 1, d).getDay();
        if (wd !== 0 && wd !== 6) candidates.push(d);
      }
    }
  }
  if (candidates.length < total) {
    for (let d = 1; d <= dim; d++) {
      if (!candidates.includes(d)) candidates.push(d);
    }
  }
  candidates.sort((a, b) => a - b);

  // Even sample across candidates
  const out: string[] = [];
  for (let i = 0; i < total; i++) {
    const idx =
      total === 1
        ? 0
        : Math.round((i * (candidates.length - 1)) / Math.max(1, total - 1));
    const day = candidates[Math.min(candidates.length - 1, idx)]!;
    out.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
  }
  // De-dupe collisions by bumping day
  const used = new Set<string>();
  return out.map((iso) => {
    let [y, m, d] = iso.split("-").map(Number);
    let guard = 0;
    while (used.has(`${y}-${m}-${d}`) && guard < dim) {
      d = d >= dim ? 1 : d + 1;
      guard++;
    }
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    used.add(key);
    return key;
  });
}

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

/** Ensure every media asset appears at least once when we have enough posts. */
function coverAllAssets(posts: PlannedPost[], assetCount: number): PlannedPost[] {
  if (assetCount === 0 || posts.length === 0) return posts;
  const used = new Set(posts.map((p) => p.sourceAssetIndex));
  const missing: number[] = [];
  for (let i = 0; i < assetCount; i++) {
    if (!used.has(i)) missing.push(i);
  }
  if (missing.length === 0) return posts;

  const next = posts.map((p) => ({ ...p }));
  // Assign missing assets to posts that duplicate the most common indices
  const counts = new Map<number, number[]>();
  next.forEach((p, idx) => {
    const list = counts.get(p.sourceAssetIndex) ?? [];
    list.push(idx);
    counts.set(p.sourceAssetIndex, list);
  });

  for (const assetIdx of missing) {
    // Find an asset used more than once, or any post
    let donor = -1;
    for (const [, idxs] of counts) {
      if (idxs.length > 1) {
        donor = idxs.pop()!;
        break;
      }
    }
    if (donor < 0) donor = next.length - 1;
    const old = next[donor]!.sourceAssetIndex;
    next[donor] = { ...next[donor]!, sourceAssetIndex: assetIdx };
    const oldList = counts.get(old);
    if (oldList) {
      const i = oldList.indexOf(donor);
      if (i >= 0) oldList.splice(i, 1);
    }
    counts.set(assetIdx, [donor]);
  }
  return next;
}

/**
 * Ask Strategy AI for content strategy + full organic month at 2–3 posts/week.
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
  const postsPerWeek = Math.min(3, Math.max(2, options.postsPerWeek ?? 3));
  const dim = daysInMonth(options.year, options.month);
  const total = targetPostCount(options.year, options.month, postsPerWeek);
  const suggestedDates = suggestPostDates(
    options.year,
    options.month,
    total,
    postsPerWeek
  );
  const monthName = new Date(options.year, options.month - 1, 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const mediaList = withFiles
    .map((a, i) => `  [${i}] ${a.filename} (${a.kind}, ${a.mimeType})`)
    .join("\n");

  const palette =
    profile.palette?.map((c) => `${c.name}:${c.hex}`).join(", ") ||
    "brand palette from design system";

  const system = `You are a senior social content strategist for organic brand content (not paid ads).
You write a real MONTHLY CONTENT STRATEGY first, then a calendar at ${postsPerWeek} posts per week.

Rules:
- Consume the locked brand only. Do NOT invent a new brand name, logo, or visual system.
- Cadence is organic: ${postsPerWeek}× per week across a ${dim}-day month = exactly ${total} posts (NOT daily).
- Spread posts across the full month using the suggested dates when possible.
- Every media index 0..${withFiles.length - 1} MUST be used at least once when there are enough posts.
- Mix content pillars (story, value/education, BTS/process, proof, soft CTA) — balanced month.
- Channels: instagram, tiktok, linkedin (subset per post OK).
- Dimensions only: IG 4:5 1080x1350 · TikTok 9:16 1080x1920 · LinkedIn 1.91:1 1200x627.
- Organic human captions; hook first; 4–8 hashtags; no spam.
- Output ONLY valid JSON. No markdown fences.`;

  const user = `Create the ${monthName} organic content plan for this brand.

BRAND (locked):
- Name: ${profile.brandName}
- Concept: ${profile.conceptStatement || "n/a"}
- Tone: ${profile.toneOfVoice.join(", ") || "n/a"}
- Personality: ${profile.personalityTraits.join(", ") || "n/a"}
- Promise: ${profile.promise || "n/a"}
- Palette: ${palette}

MEDIA LIBRARY (${withFiles.length} files — use ALL of them across the month):
${mediaList}

CHANNELS: ${platforms.join(", ")}
CADENCE: ${postsPerWeek} posts/week → exactly ${total} posts in ${monthName} (${dim} days)
SUGGESTED POST DATES (prefer these; reorder only if strategy needs it):
${suggestedDates.map((d, i) => `  ${i + 1}. ${d}`).join("\n")}

JSON schema:
{
  "strategy": {
    "monthlyTheme": "one-line theme for the month",
    "postsPerWeek": ${postsPerWeek},
    "cadenceLabel": "e.g. Tue / Thu / Sat · organic",
    "goals": ["3–5 measurable content goals"],
    "pillars": [
      { "name": "pillar name", "description": "what this pillar does for the brand" }
    ],
    "channelMix": "how IG / TikTok / LinkedIn are used this month",
    "mediaPlan": "how the ${withFiles.length} photos/video are deployed (mention video if present)",
    "voiceNotes": "tone rules for captions this month",
    "weekOutline": ["Week 1: …", "Week 2: …", "Week 3: …", "Week 4: …", "optional Week 5"]
  },
  "posts": [
    {
      "dayIndex": 1,
      "dateIso": "YYYY-MM-DD",
      "platforms": ["instagram"],
      "pillar": "pillar name",
      "caption": "full organic copy with hook",
      "hashtags": ["#tag"],
      "theme": "short theme",
      "hook": "first line",
      "creativeDirection": "how to use the specific photo/video",
      "channelRationale": "why these channels",
      "sourceAssetIndex": 0,
      "dimensions": [
        { "platform": "instagram", "aspectRatio": "4:5", "cropHint": "…", "pixelSize": "1080x1350" }
      ]
    }
  ]
}

Return strategy + exactly ${total} posts. Use every media index at least once.`;

  const result = await generateStrategyText({
    model: MODELS.reasoning,
    maxTokens: 16_000,
    system,
    messages: [{ role: "user", content: user }],
  });

  const parsed = extractJson(result.text) as {
    strategy?: Record<string, unknown>;
    monthlyTheme?: string;
    posts?: Record<string, unknown>[];
  };

  const rawPosts = Array.isArray(parsed.posts) ? parsed.posts : [];
  if (rawPosts.length === 0) {
    throw new Error("Strategy AI returned no posts for the month plan.");
  }

  const s = parsed.strategy || {};
  const strategy: ContentMonthStrategy = {
    monthlyTheme: String(
      s.monthlyTheme || parsed.monthlyTheme || `${profile.brandName} · ${monthName}`
    ),
    postsPerWeek,
    cadenceLabel: String(
      s.cadenceLabel ||
        (postsPerWeek === 2
          ? "2× per week · organic (e.g. Tue / Fri)"
          : "3× per week · organic (e.g. Tue / Thu / Sat)")
    ),
    goals: Array.isArray(s.goals)
      ? s.goals.map(String).slice(0, 8)
      : ["Stay present with organic brand content", "Use real project media", "Lead with thinking, not fluff"],
    pillars: Array.isArray(s.pillars)
      ? s.pillars.slice(0, 6).map((p) => {
          const o = p as Record<string, unknown>;
          return {
            name: String(o.name || "Pillar"),
            description: String(o.description || ""),
          };
        })
      : [
          { name: "Strategy-first", description: "Thinking before marks" },
          { name: "Process / BTS", description: "Real work, real media" },
          { name: "Proof", description: "Outcomes and clarity" },
        ],
    channelMix: String(s.channelMix || `Mix of ${platforms.join(", ")} by post intent`),
    mediaPlan: String(
      s.mediaPlan ||
        `Deploy all ${withFiles.length} library assets across the month; video for BTS/motion moments`
    ),
    voiceNotes: String(
      s.voiceNotes || profile.toneOfVoice.join(", ") || "Clear, human, no hype"
    ),
    weekOutline: Array.isArray(s.weekOutline)
      ? s.weekOutline.map(String).slice(0, 6)
      : [],
  };

  let posts: PlannedPost[] = rawPosts.slice(0, total).map((raw, i) => {
    const dayIndex = i + 1;
    let dateIso = String(raw.dateIso || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      dateIso = suggestedDates[i] || suggestedDates[suggestedDates.length - 1]!;
    }
    // Clamp date to this month
    const dayNum = Number(dateIso.slice(8, 10));
    if (
      !dateIso.startsWith(
        `${options.year}-${String(options.month).padStart(2, "0")}`
      ) ||
      dayNum < 1 ||
      dayNum > dim
    ) {
      dateIso = suggestedDates[i] || suggestedDates[0]!;
    }

    const plats = (Array.isArray(raw.platforms) ? raw.platforms : platforms)
      .map(coercePlatform)
      .filter((p): p is ContentPlatform => Boolean(p));
    const postPlatforms = plats.length ? [...new Set(plats)] : ["instagram" as ContentPlatform];

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
        const canon = defaultDimensions([platform])[0]!;
        return {
          platform,
          aspectRatio: canon.aspectRatio,
          cropHint: String(o.cropHint || canon.cropHint),
          pixelSize: canon.pixelSize,
        };
      })
      .filter((d): d is PlannedDimension => Boolean(d));

    if (dimensions.length === 0) {
      dimensions = defaultDimensions(postPlatforms);
    } else {
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
      pillar: raw.pillar ? String(raw.pillar).slice(0, 80) : undefined,
      dimensions,
      sourceAssetIndex,
    };
  });

  // Pad under-delivery using suggested dates + rotating media
  while (posts.length < total) {
    const i = posts.length;
    const base = posts[i % Math.max(1, posts.length)]!;
    posts.push({
      ...base,
      dayIndex: i + 1,
      dateIso: suggestedDates[i] || base.dateIso,
      sourceAssetIndex: i % withFiles.length,
      theme: `${base.theme} (continued)`,
    });
  }

  posts = posts.slice(0, total);
  // Force chronological dayIndex + prefer suggested dates if AI clustered
  posts = posts
    .map((p, i) => ({
      ...p,
      dayIndex: i + 1,
      dateIso: p.dateIso || suggestedDates[i]!,
    }))
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
    .map((p, i) => ({ ...p, dayIndex: i + 1 }));

  posts = coverAllAssets(posts, withFiles.length);

  return {
    posts,
    strategy,
    engine: result.engine || "strategy-direct",
    model: result.model,
  };
}

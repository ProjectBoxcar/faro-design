/** Content Studio contracts — keep aligned with services/content-studio/content_studio/models.py */

export type ContentPlatform = "instagram" | "tiktok" | "linkedin";
export type ContentPostStatus = "draft" | "approved" | "rejected";
export type BrandProfileSource = "project" | "inferred";

export type ColorToken = { name: string; hex: string };

/** Locked brand input for content generation. */
export type BrandProfile = {
  source: BrandProfileSource;
  projectId: string | null;
  brandName: string;
  conceptStatement: string | null;
  toneOfVoice: string[];
  personalityTraits: string[];
  promise: string | null;
  palette: ColorToken[];
  typography: Record<string, unknown>;
  logoAssetId: string | null;
  logoSvgPreview: string | null;
  designSystemId: string | null;
  locked: boolean;
  notes: string | null;
  /**
   * Extra strategy context from the full FARO package (audience, positioning,
   * manifesto snippets, etc.). Consumed by Content Studio planning — not a new brand.
   */
  strategyContext?: string | null;
};

/** Vision / media intelligence card for one raw asset (P0). */
export type MediaAnalysisStatus = "ok" | "partial" | "unanalyzed" | "failed";

export type MediaBrandFit = "strong" | "moderate" | "weak" | "unknown";

export type MediaCluster =
  | "lifestyle"
  | "people"
  | "place"
  | "product"
  | "event"
  | "pet"
  | "process"
  | "architecture"
  | "food"
  | "other";

export type MediaAnalysisCard = {
  status: MediaAnalysisStatus;
  /** 1–3 sentences: what is literally in the frame */
  summary: string;
  subjects: string[];
  setting: string;
  mood: string[];
  people: boolean;
  facesVisible: boolean;
  visibleText: string[];
  colors: string[];
  orientation: "portrait" | "landscape" | "square" | "unknown";
  /** Where the subject sits; safe zones for overlays */
  composition: string;
  cropHints: {
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
  };
  /** Honest post angles this asset can support */
  contentAngles: string[];
  /** Claims / scenes that must NOT be invented for this asset */
  doNotClaim: string[];
  brandFit: MediaBrandFit;
  brandFitNotes: string;
  cluster: MediaCluster;
  analyzedAt: string;
  model?: string;
  engine?: string;
};

/** Owner purpose tags for a raw asset (P4). */
export type ContentAssetTag =
  | "hero"
  | "bts"
  | "product"
  | "lifestyle"
  | "event"
  | "no-ads";

/** Owner-controlled flags on a raw asset (P4). */
export type AssetOwnerMeta = {
  /** Purpose tags for planning */
  tags: ContentAssetTag[];
  /** Hard exclude from month plan (and usually from OD) */
  excluded: boolean;
  /** Optional owner note for strategists / AI */
  note?: string | null;
};

export type ContentRawAsset = {
  id: string;
  profileId: string;
  filename: string;
  mimeType: string;
  kind: "image" | "video" | "unknown";
  storagePath: string | null;
  createdAt: string;
  /** Filled by vision pass before month planning */
  analysis?: MediaAnalysisCard | null;
  /** Owner tags / exclude (P4) */
  ownerMeta?: AssetOwnerMeta | null;
};

export type PlatformVariant = {
  platform: ContentPlatform;
  aspectRatio: string;
  cropHint: string;
  previewUri: string | null;
};

export type ContentPost = {
  id: string;
  calendarId: string;
  dayIndex: number;
  dateIso: string;
  platforms: ContentPlatform[];
  caption: string;
  hashtags: string[];
  variants: PlatformVariant[];
  sourceAssetIds: string[];
  status: ContentPostStatus;
  notes: string | null;
};

/** Monthly organic content strategy (Strategy AI) — shown above the calendar. */
export type ContentMonthStrategy = {
  monthlyTheme: string;
  /** 2 or 3 — target posts per week */
  postsPerWeek: number;
  /** e.g. "Tue / Thu / Sat · organic, not daily" */
  cadenceLabel: string;
  goals: string[];
  pillars: { name: string; description: string }[];
  channelMix: string;
  mediaPlan: string;
  voiceNotes: string;
  weekOutline: string[];
  /** P2 hard-gate summary for owner UI */
  consistency?: {
    repaired: number;
    warnings: number;
    errorsRemaining: number;
    issues: { severity: string; message: string }[];
  } | null;
};

export type ContentCalendar = {
  id: string;
  profileId: string;
  year: number;
  month: number;
  status: "draft" | "generating" | "ready" | "exported";
  posts: ContentPost[];
  /** Organic month strategy produced with the calendar */
  strategy?: ContentMonthStrategy | null;
};

/** Owner month brief — goals, offer, taboos (P4). */
export type MonthBrief = {
  /** What this month should achieve */
  goal?: string | null;
  /** Offer / CTA if any (soft organic) */
  offer?: string | null;
  /** Topics or claims to avoid */
  taboo?: string | null;
  /** Language / market notes (e.g. Spanish, Ecuador) */
  language?: string | null;
  /** Freeform owner notes for the strategist */
  notes?: string | null;
};

/**
 * How to reuse media when posts > usable assets.
 * - rotate: round-robin all eligible
 * - prefer-strong: stronger brand-fit first, then reuse
 * - unique-first: cover each asset once, then reuse with different angles
 */
export type MediaReusePolicy = "rotate" | "prefer-strong" | "unique-first";

export type GenerateMonthOptions = {
  year: number;
  month: number;
  /** Target posts per week (2–3 for organic). Default 3. */
  postsPerWeek?: number;
  platforms?: ContentPlatform[];
  /** Owner month brief (P4) */
  monthBrief?: MonthBrief | null;
  /** Media reuse when calendar needs more posts than assets */
  reusePolicy?: MediaReusePolicy;
  /**
   * Drop vision brandFit=weak assets from the plan (still keeps moderate/strong/unknown).
   * Owner-excluded assets are always dropped. Ensures at least one asset remains.
   */
  excludeWeakFit?: boolean;
};

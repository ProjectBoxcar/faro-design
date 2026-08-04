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
};

export type ContentRawAsset = {
  id: string;
  profileId: string;
  filename: string;
  mimeType: string;
  kind: "image" | "video" | "unknown";
  storagePath: string | null;
  createdAt: string;
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

export type ContentCalendar = {
  id: string;
  profileId: string;
  year: number;
  month: number;
  status: "draft" | "generating" | "ready" | "exported";
  posts: ContentPost[];
};

export type GenerateMonthOptions = {
  year: number;
  month: number;
  postsPerWeek?: number;
  platforms?: ContentPlatform[];
};

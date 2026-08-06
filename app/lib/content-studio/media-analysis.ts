/**
 * Media intelligence (P0) — vision pass over Content Studio raw assets.
 * Uses Strategy lane keys (Anthropic / OpenAI-compatible) with multimodal messages.
 * Results stored on content_raw_assets.analysis.
 */
import "server-only";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import Anthropic from "@anthropic-ai/sdk";
import { getProviderConfig } from "@/lib/settings";
import { extractJson } from "@/lib/json";
import {
  absoluteFromStoragePath,
  contentStudioDataRoot,
} from "@/lib/content-studio/storage";
import type { BrandProfile, ContentRawAsset, MediaAnalysisCard } from "@/lib/content-studio/types";
import {
  isUsableAnalysis,
  normalizeMediaAnalysis,
  unanalyzedCard,
} from "@/lib/content-studio/media-analysis-pure";
import { updateRawAssetAnalysis } from "@/lib/content-studio/store";
import { getFfmpegStatus, resolveFfmpegPathAsync } from "@/lib/content-studio/ffmpeg";

const execFileAsync = promisify(execFile);

const MAX_IMAGE_BYTES = 3_500_000;

function brandContextBlock(profile: BrandProfile): string {
  const parts = [
    `Brand: ${profile.brandName}`,
    profile.conceptStatement ? `Concept: ${profile.conceptStatement}` : null,
    profile.toneOfVoice.length ? `Tone: ${profile.toneOfVoice.join(", ")}` : null,
    profile.personalityTraits.length
      ? `Personality: ${profile.personalityTraits.join(", ")}`
      : null,
    profile.promise ? `Promise: ${profile.promise}` : null,
    profile.strategyContext ? `Extra strategy context:\n${profile.strategyContext}` : null,
  ];
  return parts.filter(Boolean).join("\n");
}

function analysisSystemPrompt(): string {
  return `You are a senior social content photo analyst for organic brand content.
Describe ONLY what is literally visible. Never invent studio process, sketches, logos-in-progress, or client work unless clearly visible.
Assess honest content angles this asset can support for the given brand — and what must NOT be claimed.
Output ONLY valid JSON (no markdown fences).`;
}

function analysisUserText(profile: BrandProfile, filename: string, kind: string): string {
  return `Analyze this ${kind} for Content Studio month planning.

${brandContextBlock(profile)}

File name (may be meaningless): ${filename}

Return JSON:
{
  "status": "ok",
  "summary": "1-3 sentences of what is literally in the frame",
  "subjects": ["main subjects"],
  "setting": "where/when if visible",
  "mood": ["mood words"],
  "people": true,
  "facesVisible": true,
  "visibleText": ["any readable text/logos in frame"],
  "colors": ["dominant colors"],
  "orientation": "portrait|landscape|square",
  "composition": "where subject sits; safe zones for type overlays",
  "cropHints": {
    "instagram": "4:5 crop advice",
    "tiktok": "9:16 crop advice",
    "linkedin": "1.91:1 crop advice"
  },
  "contentAngles": ["honest organic post angles this asset supports"],
  "doNotClaim": ["things that must not be invented for this asset"],
  "brandFit": "strong|moderate|weak|unknown",
  "brandFitNotes": "why fit is that level for this brand",
  "cluster": "lifestyle|people|place|product|event|pet|process|architecture|food|other"
}`;
}

function mimeForPath(filePath: string, fallback: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return fallback || "image/jpeg";
}

function readImageBase64(absPath: string, mimeType: string): { base64: string; mime: string } | null {
  if (!existsSync(absPath)) return null;
  const buf = readFileSync(absPath);
  if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
    // Still try smaller limit — skip oversized
    if (buf.length > MAX_IMAGE_BYTES) return null;
  }
  return { base64: buf.toString("base64"), mime: mimeForPath(absPath, mimeType) };
}

/** Extract up to N keyframe JPEGs with ffmpeg (PATH, FFMPEG_PATH, or ffmpeg-static). */
async function extractVideoKeyframes(
  videoAbs: string,
  outDir: string,
  maxFrames = 4
): Promise<{ frames: string[]; ffmpegPath: string | null; error?: string }> {
  mkdirSync(outDir, { recursive: true });
  const ffmpeg = await resolveFfmpegPathAsync();
  if (!ffmpeg) {
    return {
      frames: [],
      ffmpegPath: null,
      error: "ffmpeg not found (install system ffmpeg or depend on ffmpeg-static)",
    };
  }

  const pattern = path.join(outDir, "frame-%02d.jpg");
  try {
    // ~1 frame every ~2s, capped; scale keeps vision payloads small
    await execFileAsync(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        videoAbs,
        "-vf",
        "fps=1/2,scale=720:-2",
        "-frames:v",
        String(maxFrames),
        pattern,
      ],
      { timeout: 90_000, windowsHide: true }
    );
  } catch (e1) {
    // Fallback: single frame at 1s
    try {
      const single = path.join(outDir, "frame-01.jpg");
      await execFileAsync(
        ffmpeg,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-ss",
          "1",
          "-i",
          videoAbs,
          "-frames:v",
          "1",
          "-q:v",
          "4",
          single,
        ],
        { timeout: 45_000, windowsHide: true }
      );
    } catch (e2) {
      const msg1 = e1 instanceof Error ? e1.message : String(e1);
      const msg2 = e2 instanceof Error ? e2.message : String(e2);
      return {
        frames: [],
        ffmpegPath: ffmpeg,
        error: `ffmpeg extract failed: ${msg2 || msg1}`.slice(0, 200),
      };
    }
  }

  const frames = readdirSync(outDir)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort()
    .map((f) => path.join(outDir, f))
    .slice(0, maxFrames);
  return { frames, ffmpegPath: ffmpeg };
}

async function callVisionJson(opts: {
  system: string;
  userText: string;
  images: { base64: string; mime: string }[];
}): Promise<{ text: string; model: string; engine: string }> {
  const cfg = getProviderConfig();
  if (!cfg.apiKey) {
    throw new Error("No strategy API key — required for media vision analysis (Settings).");
  }
  const model = cfg.model;

  if (cfg.provider === "anthropic") {
    const client = new Anthropic({ apiKey: cfg.apiKey });
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [
      { type: "text", text: opts.userText },
      ...opts.images.map(
        (img) =>
          ({
            type: "image",
            source: {
              type: "base64",
              media_type: img.mime as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: img.base64,
            },
          }) as const
      ),
    ];
    const msg = await client.messages.create({
      model,
      max_tokens: 2000,
      system: opts.system,
      messages: [{ role: "user", content }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { text, model: msg.model, engine: "strategy-direct" };
  }

  // OpenAI-compatible vision
  const baseUrl = (cfg.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const content: unknown[] = [{ type: "text", text: opts.userText }];
  for (const img of opts.images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mime};base64,${img.base64}` },
    });
  }
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = (await resp.json()) as {
    error?: { message?: string };
    choices?: [{ message?: { content?: string } }];
    model?: string;
  };
  if (!resp.ok) {
    throw new Error(data.error?.message ?? `Vision API error: ${resp.status}`);
  }
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text: text.trim(), model: data.model ?? model, engine: "strategy-direct" };
}

async function analyzeImageFile(
  absPath: string,
  mimeType: string,
  profile: BrandProfile,
  filename: string
): Promise<MediaAnalysisCard> {
  const img = readImageBase64(absPath, mimeType);
  if (!img) {
    return unanalyzedCard("image unreadable or too large", {
      kind: "image",
      filename,
      status: "failed",
    });
  }
  try {
    const result = await callVisionJson({
      system: analysisSystemPrompt(),
      userText: analysisUserText(profile, filename, "image"),
      images: [img],
    });
    const parsed = extractJson(result.text);
    return normalizeMediaAnalysis(parsed, {
      status: "ok",
      analyzedAt: new Date().toISOString(),
      model: result.model,
      engine: result.engine,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[content-studio] vision failed for ${filename}:`, msg);
    return unanalyzedCard(msg.slice(0, 160), {
      kind: "image",
      filename,
      status: "failed",
    });
  }
}

async function analyzeVideoFile(
  absPath: string,
  profile: BrandProfile,
  filename: string,
  assetId: string
): Promise<MediaAnalysisCard> {
  const frameDir = path.join(contentStudioDataRoot(), "_keyframes", assetId);
  const { frames, ffmpegPath, error: extractError } = await extractVideoKeyframes(
    absPath,
    frameDir,
    4
  );
  if (frames.length === 0) {
    const reason = extractError || "ffmpeg keyframes unavailable — do not invent video contents";
    console.warn(`[content-studio] video frames for ${filename}:`, reason, { ffmpegPath });
    return unanalyzedCard(reason, {
      kind: "video",
      filename,
      status: "unanalyzed",
    });
  }
  const images: { base64: string; mime: string }[] = [];
  for (const f of frames) {
    const img = readImageBase64(f, "image/jpeg");
    if (img) images.push(img);
  }
  if (images.length === 0) {
    return unanalyzedCard("keyframe read failed", {
      kind: "video",
      filename,
      status: "failed",
    });
  }
  try {
    const result = await callVisionJson({
      system: analysisSystemPrompt(),
      userText:
        analysisUserText(profile, filename, "video (keyframes only)") +
        `\nYou are seeing ${images.length} keyframes from the video (extracted with ffmpeg). Summarize the whole clip from those frames only — do not invent off-camera scenes.`,
      images: images.slice(0, 4),
    });
    const parsed = extractJson(result.text);
    const card = normalizeMediaAnalysis(parsed, {
      status: "ok",
      analyzedAt: new Date().toISOString(),
      model: result.model,
      engine: result.engine,
    });
    // Mark partial if only 1 frame (less reliable for motion)
    if (frames.length === 1 && card.status === "ok") {
      return { ...card, status: "partial", brandFitNotes: `${card.brandFitNotes} (single keyframe)`.trim() };
    }
    return card;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[content-studio] video vision failed for ${filename}:`, msg);
    return unanalyzedCard(msg.slice(0, 160), {
      kind: "video",
      filename,
      status: "failed",
    });
  }
}

/** Expose ffmpeg readiness for API / UI. */
export async function mediaPipelineStatus() {
  const ff = await getFfmpegStatus();
  return {
    ffmpeg: ff,
    vision: "strategy-provider",
  };
}

/**
 * Analyze one asset with vision (or mark unanalyzed). Persists to DB when save=true.
 */
export async function analyzeRawAsset(
  asset: ContentRawAsset,
  profile: BrandProfile,
  opts?: { force?: boolean; save?: boolean }
): Promise<MediaAnalysisCard> {
  if (!opts?.force && isUsableAnalysis(asset.analysis ?? null)) {
    return asset.analysis!;
  }
  if (!asset.storagePath) {
    const card = unanalyzedCard("no storage path", {
      kind: asset.kind,
      filename: asset.filename,
    });
    if (opts?.save !== false) updateRawAssetAnalysis(asset.id, card);
    return card;
  }
  const abs = absoluteFromStoragePath(asset.storagePath);
  if (!existsSync(abs)) {
    const card = unanalyzedCard("file missing on disk", {
      kind: asset.kind,
      filename: asset.filename,
      status: "failed",
    });
    if (opts?.save !== false) updateRawAssetAnalysis(asset.id, card);
    return card;
  }

  let card: MediaAnalysisCard;
  if (asset.kind === "image") {
    card = await analyzeImageFile(abs, asset.mimeType, profile, asset.filename);
  } else if (asset.kind === "video") {
    card = await analyzeVideoFile(abs, profile, asset.filename, asset.id);
  } else {
    card = unanalyzedCard("unsupported kind", {
      kind: asset.kind,
      filename: asset.filename,
    });
  }

  if (opts?.save !== false) updateRawAssetAnalysis(asset.id, card);
  return card;
}

export type EnsureAnalysisResult = {
  assets: ContentRawAsset[];
  analyzed: number;
  skipped: number;
  failed: number;
};

/**
 * Ensure every stored asset has a media card before month planning.
 * Sequential to reduce rate-limit risk.
 */
export async function ensureAssetsAnalyzed(
  assets: ContentRawAsset[],
  profile: BrandProfile,
  opts?: { force?: boolean }
): Promise<EnsureAnalysisResult> {
  const withFiles = assets.filter((a) => Boolean(a.storagePath));
  let analyzed = 0;
  let skipped = 0;
  let failed = 0;
  const out: ContentRawAsset[] = [];

  for (const asset of assets) {
    if (!asset.storagePath) {
      out.push(asset);
      continue;
    }
    if (!opts?.force && isUsableAnalysis(asset.analysis ?? null)) {
      skipped++;
      out.push(asset);
      continue;
    }
    const card = await analyzeRawAsset(asset, profile, { force: opts?.force, save: true });
    if (card.status === "failed") failed++;
    else analyzed++;
    out.push({ ...asset, analysis: card });
  }

  // Preserve order of original list; only withFiles were candidates
  void withFiles;
  return { assets: out, analyzed, skipped, failed };
}

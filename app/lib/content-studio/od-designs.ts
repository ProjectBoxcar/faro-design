/**
 * Open Design lane — render actual social post designs from brand + user media.
 * Uses generateDesignText (OD daemon + Anthropic BYOK only). Never OpenAI/Gemini for graphics.
 */
import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { generateDesignText, MODELS } from "@/lib/ai";
import {
  absoluteFromStoragePath,
  contentStudioDataRoot,
  ensureDir,
  profileRawDir,
  toStoragePath,
} from "@/lib/content-studio/storage";
import type { BrandProfile, ContentPlatform, ContentRawAsset } from "@/lib/content-studio/types";
import type { PlannedPost } from "@/lib/content-studio/ai-plan";

export type DesignedVariant = {
  platform: ContentPlatform;
  aspectRatio: string;
  cropHint: string;
  pixelSize: string;
  /** Relative path under data/ for the HTML design file */
  storagePath: string;
  /** Browser-reachable preview URL */
  previewUri: string;
};

function designsDir(opts: { projectId: string | null; profileId: string }): string {
  const scope = opts.projectId || "_standalone";
  return path.join(contentStudioDataRoot(), scope, opts.profileId, "designs");
}

function extractHtml(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const doc = text.match(/<!DOCTYPE[\s\S]*<\/html>/i) || text.match(/<html[\s\S]*<\/html>/i);
  if (doc) return doc[0].trim();
  // Treat whole response as HTML body fragment
  if (/<div|<section|<style/i.test(text)) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${text.trim()}</body></html>`;
  }
  throw new Error("Open Design did not return HTML for the social post.");
}

function imageDataUri(asset: ContentRawAsset): string | null {
  if (!asset.storagePath || asset.kind === "video") return null;
  try {
    const abs = absoluteFromStoragePath(asset.storagePath);
    if (!existsSync(abs)) return null;
    const buf = readFileSync(abs);
    // Final HTML can embed; OD prompt never receives full base64
    if (buf.length > 4_000_000) return null;
    const mime = asset.mimeType || "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Inject user media into OD HTML after generation (keeps prompts small). */
function injectSourceImage(html: string, asset: ContentRawAsset, profileId: string): string {
  const dataUri = imageDataUri(asset);
  const mediaApi = `/api/content-studio/media?profileId=${encodeURIComponent(profileId)}&assetId=${encodeURIComponent(asset.id)}`;
  const src = dataUri || mediaApi;
  let out = html
    .replace(/SOURCE_IMAGE/g, src)
    .replace(/\{\{SOURCE_IMAGE\}\}/g, src)
    .replace(/src=["']placeholder["']/gi, `src="${src}"`)
    .replace(/src=["']#["']/g, `src="${src}"`);
  // If model used an empty img or no hero, inject a background image on the artboard root
  if (dataUri && !/data:image|<img/i.test(out)) {
    out = out.replace(
      /<body([^>]*)>/i,
      `<body$1><img src="${src}" alt="" style="position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none" />`
    );
  }
  return out;
}

function canvasCss(aspectRatio: string, pixelSize: string): { w: number; h: number } {
  const m = pixelSize.match(/(\d+)\s*x\s*(\d+)/i);
  if (m) return { w: Number(m[1]), h: Number(m[2]) };
  if (aspectRatio === "9:16") return { w: 1080, h: 1920 };
  if (aspectRatio === "1.91:1" || aspectRatio === "16:9") return { w: 1200, h: 627 };
  return { w: 1080, h: 1080 };
}

/**
 * Generate one platform visual via Open Design, write HTML under profile designs/.
 */
export async function designPostVariant(opts: {
  profile: BrandProfile;
  profileId: string;
  projectId: string | null;
  planned: PlannedPost;
  asset: ContentRawAsset;
  platform: ContentPlatform;
  aspectRatio: string;
  cropHint: string;
  pixelSize: string;
  postId: string;
}): Promise<DesignedVariant> {
  const dim = canvasCss(opts.aspectRatio, opts.pixelSize);
  const palette =
    opts.profile.palette?.map((c) => `${c.name} ${c.hex}`).join(", ") || "#111111, #FFFFFF";
  const isVideo = opts.asset.kind === "video";
  const mediaNote = isVideo
    ? `Source is video “${opts.asset.filename}”. Design a still that implies motion (gradient, play motif, filename chip). Do NOT invent a stock photo.`
    : `Hero photo will be injected server-side. You MUST use exactly: <img src="SOURCE_IMAGE" alt="${opts.asset.filename}" /> as the main visual (full-bleed or framed per creative direction).`;

  const logoHint = opts.profile.logoSvgPreview
    ? "A simplified logo mark may appear small (corner/wordmark). If SVG is long, use brand name as wordmark in brand type."
    : "Use brand name as wordmark — no invented logo mark.";

  const system = `You are Open Design producing a single social-post layout as self-contained HTML.
Output ONE complete HTML document only (no markdown, no explanation).
Rules:
- Fixed artboard ${dim.w}x${dim.h}px (aspect ${opts.aspectRatio}). Root container exactly that size.
- Use locked brand palette and tone — do not invent a new brand system.
- ${logoHint}
- For photos: use src="SOURCE_IMAGE" (literal token) on the hero <img>. Server replaces it with the real user photo.
- Include short caption text + optional hashtag strip.
- Pure HTML + CSS only (no scripts; system fonts only).
- Production-quality organic social design, not a wireframe.`;

  const logoSnippet = opts.profile.logoSvgPreview
    ? opts.profile.logoSvgPreview.slice(0, 2500)
    : "(no svg — use wordmark)";

  const user = `Brand: ${opts.profile.brandName}
Concept: ${opts.profile.conceptStatement || ""}
Tone: ${opts.profile.toneOfVoice.join(", ")}
Palette: ${palette}
Platform: ${opts.platform}
Artboard: ${dim.w}x${dim.h} (${opts.aspectRatio})
Crop guidance: ${opts.cropHint}
Post theme: ${opts.planned.theme}
Hook: ${opts.planned.hook}
Caption (shorten visually if needed): ${opts.planned.caption.slice(0, 280)}
Creative direction: ${opts.planned.creativeDirection}
Source media: ${opts.asset.filename} (${opts.asset.kind})
${mediaNote}

Logo SVG (optional, may truncate):
${logoSnippet}

Return complete HTML. Hero image src must be the literal string SOURCE_IMAGE when media is a photo.`;

  const result = await generateDesignText({
    model: MODELS.design,
    maxTokens: 6000,
    system,
    messages: [{ role: "user", content: user }],
  });

  const html = injectSourceImage(extractHtml(result.text), opts.asset, opts.profileId);
  const dir = designsDir({ projectId: opts.projectId, profileId: opts.profileId });
  ensureDir(dir);
  const filename = `${opts.postId}-${opts.platform}.html`;
  const absolutePath = path.join(dir, filename);
  writeFileSync(absolutePath, html, "utf8");
  const storagePath = toStoragePath(absolutePath);
  const previewUri = `/api/content-studio/design?profileId=${encodeURIComponent(opts.profileId)}&file=${encodeURIComponent(filename)}`;

  return {
    platform: opts.platform,
    aspectRatio: opts.aspectRatio,
    cropHint: opts.cropHint,
    pixelSize: opts.pixelSize,
    storagePath,
    previewUri,
  };
}

/**
 * Design primary platform fully via OD; secondary platforms get dimension metadata only
 * (same creative direction, no extra OD call) unless designAll is true.
 */
export async function designPlannedPost(opts: {
  profile: BrandProfile;
  profileId: string;
  projectId: string | null;
  planned: PlannedPost;
  asset: ContentRawAsset;
  postId: string;
  /** If true, OD every platform (slow). Default: primary only. */
  designAllPlatforms?: boolean;
}): Promise<
  {
    platform: ContentPlatform;
    aspectRatio: string;
    cropHint: string;
    previewUri: string | null;
    pixelSize?: string;
  }[]
> {
  const dims = opts.planned.dimensions.length
    ? opts.planned.dimensions
    : opts.planned.platforms.map((p) => ({
        platform: p,
        aspectRatio: p === "tiktok" ? "9:16" : p === "linkedin" ? "1.91:1" : "1:1",
        cropHint: "Brand-safe crop",
        pixelSize: p === "tiktok" ? "1080x1920" : p === "linkedin" ? "1200x627" : "1080x1080",
      }));

  const primary = dims[0];
  const out: {
    platform: ContentPlatform;
    aspectRatio: string;
    cropHint: string;
    previewUri: string | null;
    pixelSize?: string;
  }[] = [];

  for (let i = 0; i < dims.length; i++) {
    const d = dims[i];
    const shouldDesign = i === 0 || opts.designAllPlatforms;
    if (shouldDesign) {
      try {
        const designed = await designPostVariant({
          profile: opts.profile,
          profileId: opts.profileId,
          projectId: opts.projectId,
          planned: opts.planned,
          asset: opts.asset,
          platform: d.platform,
          aspectRatio: d.aspectRatio,
          cropHint: d.cropHint,
          pixelSize: d.pixelSize,
          postId: opts.postId,
        });
        out.push({
          platform: designed.platform,
          aspectRatio: designed.aspectRatio,
          cropHint: `${designed.cropHint} · ${designed.pixelSize}`,
          previewUri: designed.previewUri,
          pixelSize: designed.pixelSize,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[content-studio] OD design failed for ${opts.postId}/${d.platform}:`, msg);
        out.push({
          platform: d.platform,
          aspectRatio: d.aspectRatio,
          cropHint: `${d.cropHint} · ${d.pixelSize} (design pending: ${msg.slice(0, 80)})`,
          previewUri: null,
          pixelSize: d.pixelSize,
        });
      }
    } else {
      out.push({
        platform: d.platform,
        aspectRatio: d.aspectRatio,
        cropHint: `${d.cropHint} · ${d.pixelSize}`,
        previewUri: null,
        pixelSize: d.pixelSize,
      });
    }
  }

  // Ensure primary was attempted
  void primary;
  // Keep raw dir warm
  void profileRawDir({ projectId: opts.projectId, profileId: opts.profileId });
  return out;
}

/** Map of design basenames allowed under profile designs dir. */
export function resolveDesignFile(profileId: string, projectId: string | null, file: string): string | null {
  const base = path.basename(file);
  if (!base || base !== file || base.includes("..")) return null;
  if (!/\.html$/i.test(base)) return null;
  const abs = path.join(designsDir({ projectId, profileId }), base);
  if (!existsSync(abs)) return null;
  return abs;
}

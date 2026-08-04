/**
 * Open Design lane — render social post designs from brand + user media.
 * Uses generateDesignText (OD daemon + Anthropic BYOK only) — same engine as Design Studio.
 * Never OpenAI/Gemini for graphics.
 */
import "server-only";
import { existsSync, readFileSync, writeFileSync } from "fs";
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
  storagePath: string;
  previewUri: string;
};

/** Canonical platform artboards — do not freestyle sizes (foundations). */
export const PLATFORM_SPECS: Record<
  ContentPlatform,
  { aspectRatio: string; w: number; h: number; cropHint: string; pixelSize: string }
> = {
  instagram: {
    aspectRatio: "4:5",
    w: 1080,
    h: 1350,
    cropHint: "Portrait feed; subject in center third; safe margin 80px",
    pixelSize: "1080x1350",
  },
  tiktok: {
    aspectRatio: "9:16",
    w: 1080,
    h: 1920,
    cropHint: "Full vertical; keep faces/type above lower 250px UI chrome",
    pixelSize: "1080x1920",
  },
  linkedin: {
    aspectRatio: "1.91:1",
    w: 1200,
    h: 627,
    cropHint: "Landscape link image; type large enough at half scale",
    pixelSize: "1200x627",
  },
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
  if (/<div|<section|<style/i.test(text)) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${text.trim()}</body></html>`;
  }
  throw new Error("Open Design did not return HTML for the social post.");
}

function imageDataUri(asset: ContentRawAsset): string | null {
  if (!asset.storagePath || asset.kind === "video") return null;
  try {
    const abs = absoluteFromStoragePath(asset.storagePath);
    if (!existsSync(abs)) return null;
    const buf = readFileSync(abs);
    if (buf.length > 4_000_000) return null;
    const mime = asset.mimeType || "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function injectSourceImage(html: string, asset: ContentRawAsset, profileId: string): string {
  const dataUri = imageDataUri(asset);
  const mediaApi = `/api/content-studio/media?profileId=${encodeURIComponent(profileId)}&assetId=${encodeURIComponent(asset.id)}`;
  const src = dataUri || mediaApi;
  let out = html
    .replace(/SOURCE_IMAGE/g, src)
    .replace(/\{\{SOURCE_IMAGE\}\}/g, src)
    .replace(/src=["']placeholder["']/gi, `src="${src}"`)
    .replace(/src=["']#["']/g, `src="${src}"`);
  if (dataUri && !/<img[\s>]/i.test(out)) {
    out = out.replace(
      /(<div[^>]*id=["']artboard["'][^>]*>)/i,
      `$1<img class="cs-hero-fallback" src="${src}" alt="" />`
    );
  }
  return out;
}

/**
 * Force correct artboard size + readable defaults after OD returns HTML.
 * Fixes models that ignore width/height or use fluid layouts.
 */
function enforceArtboard(html: string, w: number, h: number, platform: ContentPlatform): string {
  const lockCss = `
/* Content Studio artboard lock — ${platform} ${w}x${h} */
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: ${w}px !important;
  height: ${h}px !important;
  overflow: hidden !important;
  background: #111 !important;
}
#artboard, .artboard, [data-artboard="true"] {
  position: relative !important;
  width: ${w}px !important;
  height: ${h}px !important;
  min-width: ${w}px !important;
  min-height: ${h}px !important;
  max-width: ${w}px !important;
  max-height: ${h}px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}
.cs-hero-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  pointer-events: none;
}
/* Contrast safety: body text never pure mid-gray on mid-gray */
#artboard, .artboard {
  color: #111;
}
`;

  let out = html;

  // Ensure a single artboard root
  if (!/id=["']artboard["']|class=["'][^"']*artboard/i.test(out)) {
    out = out.replace(
      /<body([^>]*)>/i,
      `<body$1><div id="artboard" class="artboard" data-artboard="true" data-platform="${platform}" data-size="${w}x${h}">`
    );
    out = out.replace(/<\/body>/i, `</div></body>`);
  } else {
    // Tag existing artboard
    out = out.replace(
      /(<div[^>]*(?:id=["']artboard["']|class=["'][^"']*artboard)[^>]*)(>)/i,
      `$1 data-artboard="true" data-platform="${platform}" data-size="${w}x${h}"$2`
    );
  }

  // Inject lock CSS before </head> or at start of body
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `<style id="cs-artboard-lock">${lockCss}</style></head>`);
  } else if (/<body/i.test(out)) {
    out = out.replace(
      /<body([^>]*)>/i,
      `<head><meta charset="utf-8"><style id="cs-artboard-lock">${lockCss}</style></head><body$1>`
    );
  } else {
    out = `<!DOCTYPE html><html><head><meta charset="utf-8"><style id="cs-artboard-lock">${lockCss}</style></head><body><div id="artboard" class="artboard" data-artboard="true">${out}</div></body></html>`;
  }

  // Strip remote fonts/CDNs that break offline and foundation consistency
  out = out.replace(/@import\s+url\([^)]+\);?/gi, "");
  out = out.replace(/<link[^>]+href=["']https?:\/\/[^"']+["'][^>]*>/gi, "");

  return out;
}

async function loadDesignSystemSnippet(projectId: string | null): Promise<string> {
  if (!projectId) return "";
  try {
    const { listAssets } = await import("@/lib/design");
    const ds = listAssets(projectId).find((a) => a.kind === "design_system" && a.selected);
    if (!ds?.html) return "";
    // Cap prompt size — keep tokens + structure, not full page bloat
    return ds.html.slice(0, 14_000);
  } catch {
    return "";
  }
}

function buildSocialPostPrompt(opts: {
  profile: BrandProfile;
  planned: PlannedPost;
  asset: ContentRawAsset;
  platform: ContentPlatform;
  w: number;
  h: number;
  aspectRatio: string;
  cropHint: string;
  designSystemHtml: string;
}): string {
  const palette =
    opts.profile.palette?.map((c) => `${c.name} ${c.hex}`).join(", ") ||
    "use palette tokens from the design system only";
  const isVideo = opts.asset.kind === "video";
  const logoSnippet = opts.profile.logoSvgPreview
    ? opts.profile.logoSvgPreview.slice(0, 3000)
    : "(no svg — wordmark only)";

  const mediaBlock = isVideo
    ? `MEDIA: video still implied (“${opts.asset.filename}”). Do NOT invent a stock photo. Use brand gradient + abstract motion motif + play glyph; filename may appear as a small chip.`
    : `MEDIA: Hero MUST be <img src="SOURCE_IMAGE" alt="${opts.asset.filename}" /> with object-fit:cover. The server injects the real user photo. Photo is the hero — do not cover it with opaque full-bleed panels; use gradient scrims only where type sits.`;

  return [
    `You are Open Design (Faro Design Studio pipeline) producing ONE social post as a single offline HTML file.`,
    `This is an APPLICATION of the locked brand identity — not a new visual system.`,
    ``,
    `ARTBOARD (non-negotiable):`,
    `- Exact pixel size: ${opts.w}px × ${opts.h}px (aspect ${opts.aspectRatio}) for ${opts.platform}.`,
    `- Root: <div id="artboard" class="artboard" data-artboard="true"> must be EXACTLY ${opts.w}×${opts.h}px. No fluid %, no 100vw, no responsive reflow of the artboard.`,
    `- html/body same size, margin 0, overflow hidden.`,
    `- Crop/safe zone: ${opts.cropHint}`,
    ``,
    `DESIGN FOUNDATIONS (non-negotiable):`,
    `1. SIZE & GRID — Use a clear grid. Margins ≥ 64px from edges (48px on LinkedIn landscape). Type and logo never kiss the edge.`,
    `2. HIERARCHY — One dominant message (hook). Supporting line smaller. Hashtags smallest. Scale jump ≥ 1.5× between levels.`,
    `3. CONTRAST — Text on photo MUST sit on a scrim/gradient with WCAG-ish contrast (light text on dark scrim or dark text on light panel). Never mid-gray on photo. Never thin white text on bright sky without overlay.`,
    `4. TYPE — System stack only: ui-sans-serif, system-ui, "Segoe UI", Helvetica, Arial, sans-serif (or design-system specified stacks if present). No Google Fonts / remote @import.`,
    `5. COLOR — ONLY brand palette + neutrals from the design system / listed tokens. No random indigo/purple AI defaults.`,
    `6. LOGO — Small, correct, never redrawn. Corner lockup. If SVG provided, inline a simplified use; else wordmark in brand color.`,
    `7. COMPOSITION — Photo-led organic social (not a landing page, not a wireframe). Breathing room. Max 2 type blocks + optional hashtag row.`,
    `8. OFFLINE — Inline CSS only. No scripts. No external URLs.`,
    ``,
    `BRAND (locked):`,
    `- Name: ${opts.profile.brandName}`,
    `- Concept: ${opts.profile.conceptStatement || "n/a"}`,
    `- Tone: ${opts.profile.toneOfVoice.join(", ") || "n/a"}`,
    `- Personality: ${opts.profile.personalityTraits.join(", ") || "n/a"}`,
    `- Promise: ${opts.profile.promise || "n/a"}`,
    `- Palette tokens: ${palette}`,
    ``,
    `POST CONTENT (use as design copy — do not invent claims):`,
    `- Theme: ${opts.planned.theme}`,
    `- Hook (primary type): ${opts.planned.hook}`,
    `- Caption short for on-image (≤ 90 chars if possible): ${opts.planned.caption.slice(0, 160)}`,
    `- Hashtags (optional small row): ${opts.planned.hashtags.slice(0, 6).join(" ")}`,
    `- Art direction: ${opts.planned.creativeDirection}`,
    ``,
    mediaBlock,
    ``,
    `LOGO SVG (optional):`,
    logoSnippet,
    ``,
    opts.designSystemHtml
      ? `DESIGN SYSTEM HTML (tokens / type / color — follow these; do not invent a new system):\n${opts.designSystemHtml}`
      : `No full design system HTML attached — stay strict to palette tokens and tone above.`,
    ``,
    `OUTPUT: Only the complete HTML document starting with <!DOCTYPE html>. No markdown fences. No commentary.`,
  ].join("\n");
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
  // Prefer canonical platform specs over freeform AI dimensions (foundations).
  const spec = PLATFORM_SPECS[opts.platform] ?? PLATFORM_SPECS.instagram;
  const w = spec.w;
  const h = spec.h;
  const aspectRatio = spec.aspectRatio;
  const pixelSize = spec.pixelSize;
  const cropHint = opts.cropHint || spec.cropHint;

  const designSystemHtml = await loadDesignSystemSnippet(opts.projectId);
  const prompt = buildSocialPostPrompt({
    profile: opts.profile,
    planned: opts.planned,
    asset: opts.asset,
    platform: opts.platform,
    w,
    h,
    aspectRatio,
    cropHint,
    designSystemHtml,
  });

  const system = [
    "You are a senior brand designer in the Faro Open Design pipeline.",
    "You produce production-grade social post HTML that applies an existing brand system.",
    "Never invent brand claims or a new identity. Obey exact artboard pixel sizes.",
    "Contrast, hierarchy, margins, and type scale are mandatory foundations — not optional polish.",
  ].join(" ");

  const result = await generateDesignText({
    model: MODELS.design,
    maxTokens: 8000,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  let html = extractHtml(result.text);
  html = injectSourceImage(html, opts.asset, opts.profileId);
  html = enforceArtboard(html, w, h, opts.platform);

  const dir = designsDir({ projectId: opts.projectId, profileId: opts.profileId });
  ensureDir(dir);
  const filename = `${opts.postId}-${opts.platform}.html`;
  const absolutePath = path.join(dir, filename);
  writeFileSync(absolutePath, html, "utf8");
  const storagePath = toStoragePath(absolutePath);
  const previewUri = `/api/content-studio/design?profileId=${encodeURIComponent(opts.profileId)}&file=${encodeURIComponent(filename)}`;

  return {
    platform: opts.platform,
    aspectRatio,
    cropHint: `${cropHint} · ${pixelSize}`,
    pixelSize,
    storagePath,
    previewUri,
  };
}

/**
 * Design primary platform via OD; secondary platforms get canonical dimension metadata only
 * unless designAllPlatforms is true.
 */
export async function designPlannedPost(opts: {
  profile: BrandProfile;
  profileId: string;
  projectId: string | null;
  planned: PlannedPost;
  asset: ContentRawAsset;
  postId: string;
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
  // Normalize platforms against canonical specs
  const platforms =
    opts.planned.platforms.length > 0
      ? opts.planned.platforms
      : (["instagram"] as ContentPlatform[]);

  const dims = platforms.map((p) => {
    const spec = PLATFORM_SPECS[p] ?? PLATFORM_SPECS.instagram;
    const fromPlan = opts.planned.dimensions.find((d) => d.platform === p);
    return {
      platform: p,
      aspectRatio: spec.aspectRatio,
      cropHint: fromPlan?.cropHint || spec.cropHint,
      pixelSize: spec.pixelSize,
    };
  });

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
          cropHint: designed.cropHint,
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

  void profileRawDir({ projectId: opts.projectId, profileId: opts.profileId });
  return out;
}

export function resolveDesignFile(
  profileId: string,
  projectId: string | null,
  file: string
): string | null {
  const base = path.basename(file);
  if (!base || base !== file || base.includes("..")) return null;
  if (!/\.html$/i.test(base)) return null;
  const abs = path.join(designsDir({ projectId, profileId }), base);
  if (!existsSync(abs)) return null;
  return abs;
}

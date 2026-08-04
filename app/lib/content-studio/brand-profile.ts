/**
 * Brand profile ingestion for Content Studio (TypeScript façade).
 * Mirrors services/content-studio brand_profile.py — Workflow A from live project DB.
 */
import "server-only";
import { listAssets } from "@/lib/design";
import { getProject, getSectionRow, listStudioAssets } from "@/lib/queries";
import type { BrandProfile, ColorToken } from "@/lib/content-studio/types";
import { contentStudioBlockedReason } from "@/lib/content-studio/gates";

function fieldString(value: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!value) return "";
  for (const k of keys) {
    const v = value[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function listStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((x) => {
        if (typeof x === "string") return x.trim();
        if (x && typeof x === "object") {
          const o = x as Record<string, unknown>;
          return String(o.trait || o.characteristic || o.value || o.label || "").trim();
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function extractPalette(designHtml: string | null | undefined): ColorToken[] {
  if (!designHtml) return [];
  const hexes = [...designHtml.matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => `#${m[1].toUpperCase()}`);
  const unique = [...new Set(hexes)].slice(0, 8);
  return unique.map((hex, i) => ({ name: `color-${i + 1}`, hex }));
}

/**
 * Workflow A: locked profile from a completed FARO project.
 * Throws if package gates fail — callers should check contentStudioBlockedReason first.
 */
export function ingestBrandProfileFromProject(projectId: string): BrandProfile {
  const blocked = contentStudioBlockedReason(projectId);
  if (blocked) throw new Error(blocked);

  const project = getProject(projectId)!;
  const concept = getSectionRow(projectId, "concept")?.value as Record<string, unknown> | undefined;
  const tone = getSectionRow(projectId, "communication.tone")?.value as Record<string, unknown> | undefined;
  const personality = getSectionRow(projectId, "communication.personality")?.value as
    | Record<string, unknown>
    | undefined;
  const promise = getSectionRow(projectId, "communication.promise")?.value as
    | Record<string, unknown>
    | undefined;

  const logo = listStudioAssets(projectId, "logo").find((a) => a.status === "approved");
  const designSystem = listAssets(projectId).find((a) => a.kind === "design_system" && a.selected);

  const toneList = listStrings(tone?.characteristics ?? tone?.traits ?? tone);
  const personalityList = listStrings(personality?.traits ?? personality);

  return {
    source: "project",
    projectId,
    brandName: project.name,
    conceptStatement:
      fieldString(concept, "statement") || fieldString(concept, "description") || null,
    toneOfVoice: toneList,
    personalityTraits: personalityList,
    promise: fieldString(promise, "statement") || null,
    palette: extractPalette(designSystem?.html ?? null),
    typography: {},
    logoAssetId: logo?.id ?? null,
    logoSvgPreview: (logo?.payload as { svg?: string } | null)?.svg ?? null,
    designSystemId: designSystem?.id ?? null,
    locked: true,
    notes: "Ingested from completed FARO brand package. Do not regenerate brand here.",
  };
}

/** Workflow B placeholder: infer starter profile from filenames/kinds only. */
export function inferBrandProfileFromAssets(
  brandName: string,
  assets: { filename: string; kind: string }[]
): BrandProfile {
  const hasVideo = assets.some((a) => a.kind === "video");
  const hasImage = assets.some((a) => a.kind === "image");
  const mood = ["documentary", "authentic"];
  if (hasVideo) mood.push("motion-led");
  if (hasImage) mood.push("still-first");

  return {
    source: "inferred",
    projectId: null,
    brandName: brandName.trim() || "Untitled",
    conceptStatement: "A working voice inferred from uploaded media (refine anytime).",
    toneOfVoice: mood,
    personalityTraits: ["approachable", "visual-first"],
    promise: null,
    palette: [
      { name: "ink", hex: "#1A1A1A" },
      { name: "paper", hex: "#F7F4EF" },
      { name: "accent", hex: "#C45C26" },
    ],
    typography: { heading: "system-ui", body: "system-ui" },
    logoAssetId: null,
    logoSvgPreview: null,
    designSystemId: null,
    locked: true,
    notes:
      "Inferred starter profile from raw assets — not a full FARO strategy. Suitable for content consistency only.",
  };
}

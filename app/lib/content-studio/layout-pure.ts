/**
 * Pure layout / composition suggestions for Content Studio Open Design (P3).
 * Driven by vision analysis cards — no I/O.
 */
import type { ContentPlatform, MediaAnalysisCard } from "@/lib/content-studio/types";

export type LayoutTemplate =
  | "photo-led-bottom-type"
  | "photo-led-top-type"
  | "photo-led-left-safe"
  | "photo-led-right-safe"
  | "centered-scrim"
  | "split-band";

export type LayoutSuggestion = {
  template: LayoutTemplate;
  /** CSS object-position for the hero photo */
  objectPosition: string;
  /** Where primary type should live */
  typeZone: "top" | "bottom" | "left" | "right" | "center";
  /** Scrim strength for contrast over photo */
  scrim: "soft" | "medium" | "strong";
  /** Prefer light text on dark scrim vs dark text on light panel */
  typeOn: "light-on-dark" | "dark-on-light";
  /** Human-readable art direction for the model */
  instructions: string;
  /** Short label for notes / UI */
  label: string;
};

function hasFaces(card: MediaAnalysisCard | null | undefined): boolean {
  return Boolean(card?.facesVisible || card?.people);
}

function mentionsTop(composition: string): boolean {
  return /\b(top|upper|sky|ceiling|forehead)\b/i.test(composition);
}

function mentionsBottom(composition: string): boolean {
  return /\b(bottom|lower|feet|ground|grass|floor)\b/i.test(composition);
}

function mentionsLeft(composition: string): boolean {
  return /\b(left|west)\b/i.test(composition);
}

function mentionsRight(composition: string): boolean {
  return /\b(right|east)\b/i.test(composition);
}

function mentionsCenter(composition: string): boolean {
  return /\b(center|centre|middle)\b/i.test(composition);
}

/**
 * Suggest a social layout template from vision analysis + platform artboard.
 */
export function suggestLayoutFromMedia(
  card: MediaAnalysisCard | null | undefined,
  platform: ContentPlatform
): LayoutSuggestion {
  const composition = card?.composition || "";
  const cluster = card?.cluster || "other";
  const faces = hasFaces(card);
  const isLandscape = platform === "linkedin" || card?.orientation === "landscape";

  // Defaults: photo-led, type in lower third (safest for organic social)
  let template: LayoutTemplate = "photo-led-bottom-type";
  let typeZone: LayoutSuggestion["typeZone"] = "bottom";
  let objectPosition = "50% 40%";
  let scrim: LayoutSuggestion["scrim"] = "medium";
  let typeOn: LayoutSuggestion["typeOn"] = "light-on-dark";

  if (faces) {
    // Keep faces clear — type away from them
    if (mentionsTop(composition) || mentionsCenter(composition)) {
      template = "photo-led-bottom-type";
      typeZone = "bottom";
      objectPosition = "50% 30%";
      scrim = "strong";
    } else if (mentionsBottom(composition)) {
      template = "photo-led-top-type";
      typeZone = "top";
      objectPosition = "50% 55%";
      scrim = "medium";
    } else {
      template = "photo-led-bottom-type";
      typeZone = "bottom";
      objectPosition = "50% 35%";
      scrim = "strong";
    }
  } else if (cluster === "architecture" || cluster === "place") {
    template = isLandscape ? "split-band" : "photo-led-bottom-type";
    typeZone = "bottom";
    objectPosition = mentionsLeft(composition)
      ? "35% 50%"
      : mentionsRight(composition)
        ? "65% 50%"
        : "50% 45%";
    scrim = "medium";
  } else if (cluster === "food" || cluster === "product") {
    template = "centered-scrim";
    typeZone = "bottom";
    objectPosition = "50% 45%";
    scrim = "strong";
  } else if (cluster === "pet") {
    template = "photo-led-bottom-type";
    typeZone = "bottom";
    objectPosition = "50% 40%";
    scrim = "medium";
  } else if (mentionsLeft(composition) && !mentionsRight(composition)) {
    template = "photo-led-right-safe";
    typeZone = "right";
    objectPosition = "30% 50%";
    scrim = "soft";
  } else if (mentionsRight(composition) && !mentionsLeft(composition)) {
    template = "photo-led-left-safe";
    typeZone = "left";
    objectPosition = "70% 50%";
    scrim = "soft";
  }

  // LinkedIn landscape: prefer bottom band for readability at half scale
  if (platform === "linkedin" && typeZone !== "bottom" && typeZone !== "top") {
    typeZone = "bottom";
    template = "split-band";
  }

  const label = `${template} · type=${typeZone} · scrim=${scrim}`;
  const instructions = [
    `LAYOUT TEMPLATE (non-negotiable): ${template}.`,
    `Type zone: ${typeZone}. Keep primary hook in that zone only.`,
    `Hero <img> object-fit:cover; object-position: ${objectPosition}.`,
    `Scrim: ${scrim} gradient/panel under type (${typeOn === "light-on-dark" ? "light type on dark scrim" : "dark type on light panel"}).`,
    faces
      ? "Faces are visible — never cover eyes/faces with type or opaque panels; leave face region clear."
      : "No critical faces — still keep type off the main subject if known.",
    `Platform ${platform}: respect safe margins (IG/TikTok ≥64px; LinkedIn ≥48px).`,
    "Photo is the hero. Max 2 type blocks + optional small hashtag row + corner logo.",
  ].join(" ");

  return {
    template,
    objectPosition,
    typeZone,
    scrim,
    typeOn,
    instructions,
    label,
  };
}

/** CSS snippet injected post-OD to reinforce layout (object-position + type zone). */
export function layoutLockCss(layout: LayoutSuggestion, w: number, h: number): string {
  const typePos =
    layout.typeZone === "top"
      ? "top: 0; bottom: auto; padding-top: 64px;"
      : layout.typeZone === "bottom"
        ? "bottom: 0; top: auto; padding-bottom: 64px;"
        : layout.typeZone === "left"
          ? "left: 0; right: auto; width: 48%; padding: 64px;"
          : layout.typeZone === "right"
            ? "right: 0; left: auto; width: 48%; padding: 64px;"
            : "inset: 0; display:flex; align-items:center; justify-content:center;";

  const scrimBg =
    layout.scrim === "strong"
      ? "linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,.35) 45%, transparent 75%)"
      : layout.scrim === "medium"
        ? "linear-gradient(to top, rgba(0,0,0,.55) 0%, rgba(0,0,0,.2) 50%, transparent 80%)"
        : "linear-gradient(to top, rgba(0,0,0,.4) 0%, transparent 60%)";

  const color = layout.typeOn === "light-on-dark" ? "#f7f4ef" : "#111111";

  return `
/* Content Studio layout lock — ${layout.label} */
#artboard img.cs-hero-fallback,
#artboard img[src],
#artboard .cs-hero {
  object-fit: cover !important;
  object-position: ${layout.objectPosition} !important;
}
#artboard .cs-type-zone,
#artboard [data-type-zone="true"] {
  position: absolute !important;
  ${typePos}
  z-index: 2;
  color: ${color} !important;
  box-sizing: border-box;
  max-width: 100%;
}
#artboard .cs-scrim,
#artboard [data-scrim="true"] {
  position: absolute !important;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: ${scrimBg};
}
/* Ensure artboard size retained */
#artboard { width: ${w}px; height: ${h}px; }
`.trim();
}

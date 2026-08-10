/**
 * Journey coach — pure path → tip map (no server, no DB).
 * Used by the floating guide from welcome through Brand Handover / Content Studio.
 */

import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/types";

export type CoachScene =
  | "home"
  | "start"
  | "settings"
  | "hub"
  | "strategy"
  | "strategy_map"
  | "name"
  | "logo"
  | "design"
  | "handover"
  | "content"
  | "content_standalone"
  | "hidden";

export type CoachTip = {
  scene: CoachScene;
  /** Short kicker under the character name */
  title: string;
  /** One calm, outcome-first line */
  body: string;
  /** Optional primary action label (href filled by UI when project known) */
  ctaLabel?: string;
  /** Relative path template; `{id}` replaced with project id */
  ctaHrefTemplate?: string;
};

const SCENE_KEYS: Record<
  Exclude<CoachScene, "hidden">,
  { title: string; body: string; cta?: string; href?: string }
> = {
  home: {
    title: "coachTip.homeTitle",
    body: "coachTip.homeBody",
    cta: "home.startBrand",
    href: "/start",
  },
  start: { title: "coachTip.startTitle", body: "coachTip.startBody" },
  settings: { title: "coachTip.settingsTitle", body: "coachTip.settingsBody" },
  hub: { title: "coachTip.hubTitle", body: "coachTip.hubBody" },
  strategy: { title: "coachTip.strategyTitle", body: "coachTip.strategyBody" },
  strategy_map: { title: "coachTip.mapTitle", body: "coachTip.mapBody" },
  name: { title: "coachTip.nameTitle", body: "coachTip.nameBody" },
  logo: { title: "coachTip.logoTitle", body: "coachTip.logoBody" },
  design: { title: "coachTip.designTitle", body: "coachTip.designBody" },
  handover: { title: "coachTip.handoverTitle", body: "coachTip.handoverBody" },
  content: { title: "coachTip.contentTitle", body: "coachTip.contentBody" },
  content_standalone: {
    title: "coachTip.contentSoloTitle",
    body: "coachTip.contentSoloBody",
    cta: "common.home",
    href: "/",
  },
};

function tipForScene(scene: Exclude<CoachScene, "hidden">, locale: AppLocale): CoachTip {
  const keys = SCENE_KEYS[scene];
  return {
    scene,
    title: translate(locale, keys.title),
    body: translate(locale, keys.body),
    ctaLabel: keys.cta ? translate(locale, keys.cta) : undefined,
    ctaHrefTemplate: keys.href,
  };
}

/**
 * Map Next.js pathname → coach tip.
 * Returns scene "hidden" for public share / unlock (no owner coach).
 */
export function coachTipFromPath(
  pathname: string,
  locale: AppLocale = "en"
): CoachTip | { scene: "hidden" } {
  const path = (pathname || "/").split("?")[0] || "/";

  if (path.startsWith("/share") || path.startsWith("/unlock")) {
    return { scene: "hidden" };
  }

  if (path === "/" || path === "") return tipForScene("home", locale);
  if (path.startsWith("/start")) return tipForScene("start", locale);
  if (path.startsWith("/settings")) return tipForScene("settings", locale);
  if (path === "/content-studio" || path.startsWith("/content-studio/")) {
    return tipForScene("content_standalone", locale);
  }

  const projectMatch = path.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
  if (projectMatch) {
    const rest = projectMatch[2] ?? "";
    if (!rest || rest === "") return tipForScene("hub", locale);
    if (rest.startsWith("express")) return tipForScene("strategy", locale);
    if (rest.startsWith("review")) return tipForScene("strategy_map", locale);
    if (rest.startsWith("name")) return tipForScene("name", locale);
    if (rest.startsWith("studio")) return tipForScene("logo", locale);
    if (rest.startsWith("design")) return tipForScene("design", locale);
    if (rest.startsWith("handover")) return tipForScene("handover", locale);
    if (rest.startsWith("content")) return tipForScene("content", locale);
    return tipForScene("strategy_map", locale);
  }

  return tipForScene("home", locale);
}

/** Extract project id from pathname when on a project route. */
export function projectIdFromPath(pathname: string): string | null {
  const m = (pathname || "").match(/^\/projects\/([^/]+)/);
  return m?.[1] ?? null;
}

export function resolveCoachCtaHref(
  tip: CoachTip,
  projectId: string | null
): string | null {
  if (!tip.ctaHrefTemplate) return null;
  if (tip.ctaHrefTemplate.includes("{id}")) {
    if (!projectId) return null;
    return tip.ctaHrefTemplate.replace("{id}", projectId);
  }
  return tip.ctaHrefTemplate;
}

/**
 * Journey coach — pure path → tip map (no server, no DB).
 * Used by the floating guide from welcome through Brand Handover / Content Studio.
 */

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

const TIPS: Record<Exclude<CoachScene, "hidden">, CoachTip> = {
  home: {
    scene: "home",
    title: "Welcome",
    body: "I’m Faro — I’ll stay with you from first questions to a brand package you can share. Start a project when you’re ready.",
    ctaLabel: "Start your brand",
    ctaHrefTemplate: "/start",
  },
  start: {
    scene: "start",
    title: "Plain questions",
    body: "A few honest answers beat perfect ones. Next, you’ll get a strategy draft to review — nothing is final until you approve.",
  },
  settings: {
    scene: "settings",
    title: "Keys for AI stages",
    body: "Strategy needs Claude. Logos need OpenAI or Gemini. Design needs Claude plus the design helper (start with start.bat).",
  },
  hub: {
    scene: "hub",
    title: "Your project hub",
    body: "Use Continue for the next step. The rail shows the full path: strategy → name → logo → design → handover → content.",
  },
  strategy: {
    scene: "strategy",
    title: "Strategy essentials",
    body: "Edit what doesn’t sound like you. Apply my edits so related cards follow. When it feels right, approve and continue to the brand name.",
  },
  strategy_map: {
    scene: "strategy_map",
    title: "Full strategy map",
    body: "Optional deep map. Day-to-day progress still follows Continue and the essentials path — not every pillar at once.",
  },
  name: {
    scene: "name",
    title: "Brand name",
    body: "Lock the name logos will use. A working title is fine earlier — here you confirm what goes on the mark.",
  },
  logo: {
    scene: "logo",
    title: "Logo Workshop",
    body: "Compare directions, keep what fits, approve one. Design Studio builds the system from the logo you choose.",
  },
  design: {
    scene: "design",
    title: "Design Studio",
    body: "Your approved logo leads. Pick one identity, then build landing page and deck. Client link and product files live on Brand Handover.",
  },
  handover: {
    scene: "handover",
    title: "Brand Handover",
    body: "Everything you approved in one place. Download files for product teams, present full screen, or share a private client link.",
  },
  content: {
    scene: "content",
    title: "Put the brand to work",
    body: "Plan a month of posts from your photos, then approve what ships. Your finished brand stays locked while you create.",
  },
  content_standalone: {
    scene: "content_standalone",
    title: "Content Studio",
    body: "Name the brand, add photos, then build a month of posts. For a full Faro package, start a project from the home page.",
    ctaLabel: "Home",
    ctaHrefTemplate: "/",
  },
};

/**
 * Map Next.js pathname → coach tip.
 * Returns scene "hidden" for public share / unlock (no owner coach).
 */
export function coachTipFromPath(pathname: string): CoachTip | { scene: "hidden" } {
  const path = (pathname || "/").split("?")[0] || "/";

  if (path.startsWith("/share") || path.startsWith("/unlock")) {
    return { scene: "hidden" };
  }

  if (path === "/" || path === "") return TIPS.home;
  if (path.startsWith("/start")) return TIPS.start;
  if (path.startsWith("/settings")) return TIPS.settings;
  if (path === "/content-studio" || path.startsWith("/content-studio/")) {
    return TIPS.content_standalone;
  }

  const projectMatch = path.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
  if (projectMatch) {
    const rest = projectMatch[2] ?? "";
    if (!rest || rest === "") return TIPS.hub;
    if (rest.startsWith("express")) return TIPS.strategy;
    if (rest.startsWith("review")) return TIPS.strategy_map;
    if (rest.startsWith("name")) return TIPS.name;
    if (rest.startsWith("studio")) return TIPS.logo;
    if (rest.startsWith("design")) return TIPS.design;
    if (rest.startsWith("handover")) return TIPS.handover;
    if (rest.startsWith("content")) return TIPS.content;
    // Section editor under project root
    return TIPS.strategy_map;
  }

  return TIPS.home;
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

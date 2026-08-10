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
    title: "Glad you’re here",
    body: "I’m Faro. I’ll walk with you from a few plain questions to a brand you can explain — and a package you can hand off. Nothing is final until you say so. Ready when you are.",
    ctaLabel: "Start your brand",
    ctaHrefTemplate: "/start",
  },
  start: {
    scene: "start",
    title: "Honest answers",
    body: "Don’t polish these for me. A few true lines beat a perfect essay. I’ll turn them into a strategy draft you can read and fix — you’re still the author.",
  },
  settings: {
    scene: "settings",
    title: "Keeping the light on",
    body: "I need a Claude key for strategy and design, and OpenAI or Gemini for logos. Start Faro with start.bat so the design helper is awake. Then we can go far.",
  },
  hub: {
    scene: "hub",
    title: "Your map",
    body: "This is home base. Hit Continue for the next real step. The rail is our path: strategy, name, logo, design, handover, then content. One light at a time.",
  },
  strategy: {
    scene: "strategy",
    title: "Does this sound like you?",
    body: "Read the essentials. Change anything that isn’t your voice. Apply your edits so the rest can follow — then approve when it feels true, and we’ll name the brand.",
  },
  strategy_map: {
    scene: "strategy_map",
    title: "The deep chart",
    body: "This full map is optional. Use it when you want every pillar. Day to day, stick with Continue and the essentials — don’t get lost in the fog.",
  },
  name: {
    scene: "name",
    title: "What we call it",
    body: "Here we lock the name that goes on the mark. A working title was fine before; now choose what you’ll stand behind when the logo ships.",
  },
  logo: {
    scene: "logo",
    title: "The face of it",
    body: "Look at the directions. Keep what feels right, drop the rest. When you approve one mark, Design Studio builds the system around it — not the other way around.",
  },
  design: {
    scene: "design",
    title: "System and mockups",
    body: "Your logo leads. Pick one identity, then build the landing page and deck. When you’re ready to share or download, meet me on Brand Handover — that’s where the client link lives.",
  },
  handover: {
    scene: "handover",
    title: "Safe harbour",
    body: "Everything you approved, in one place. Download files for product teams, present full screen, or share a private client link. This is the handoff — clean and calm.",
  },
  content: {
    scene: "content",
    title: "Out into the weather",
    body: "The brand is built. Now we put it to work — a month of posts from your real photos. You still approve what ships. I just keep the light steady.",
  },
  content_standalone: {
    scene: "content_standalone",
    title: "Content without the full voyage",
    body: "We can plan posts from photos here. If you want the full Faro package — strategy through handover — start a project from home. I’ll be there either way.",
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

import type { CallAgendaItem, CallBeat, CallStageId, FaroCallContext } from "@/lib/faro-call/types";

export type CallAssetSnapshot = {
  projectName: string;
  confirmedName: string | null;
  conceptLine: string | null;
  manifestoLine: string | null;
  logoSvg: string | null;
  logoSvgOnDark: string | null;
  identityHtml: string | null;
  landingHtml: string | null;
  deckHtml: string | null;
  channelLabels: { label: string; ready: boolean }[];
  packageReady: boolean;
  contentReady: boolean;
  shareHref: string | null;
  contentHref: string;
  handoverHref: string;
  designHref: string;
  expressHref: string;
  nameHref: string;
  logoHref: string;
};

function stageIdFromJourney(id: string): CallStageId | null {
  if (id === "strategy" || id === "name" || id === "logo" || id === "design" || id === "handover" || id === "content") {
    return id;
  }
  return null;
}

/**
 * Build call agenda + spoken beats from journey status + real project assets.
 * Pure — no DB. Scripts stay grounded in provided snapshot fields only.
 */
export function buildFaroCallContext(
  projectId: string,
  agendaIn: CallAgendaItem[],
  snap: CallAssetSnapshot
): FaroCallContext {
  const agenda = agendaIn;
  const name = snap.confirmedName || snap.projectName;
  const beats: CallBeat[] = [];

  beats.push({
    id: "welcome",
    stageId: "strategy",
    line: `Hi, I'm Faro. We're on a call about ${name}. I'll show you what this project already has — strategy, name, logo, design, and what's left — using the real files. Ask me anything in the chat as we go.`,
    media: {
      kind: "text",
      title: "Faro Call",
      body: "Live walkthrough of your brand. Ask questions anytime.",
    },
  });

  // Strategy
  const strategyBody =
    [snap.conceptLine, snap.manifestoLine].filter(Boolean).join("\n\n") ||
    "Strategy essentials are still drafting. When they're ready, they'll show here.";
  beats.push({
    id: "strategy-open",
    stageId: "strategy",
    line: snap.conceptLine
      ? `First, strategy for ${name}. Here's the core idea we drafted from your answers.`
      : `First comes strategy for ${name}. When the essentials are drafted, your concept shows up here.`,
    media: {
      kind: "text",
      title: "1. Strategy",
      body: strategyBody,
      ctaLabel: "Open strategy review",
      ctaHref: snap.expressHref,
    },
  });

  // Name
  beats.push({
    id: "name-lock",
    stageId: "name",
    line: snap.confirmedName
      ? `The name locked for logos is ${snap.confirmedName}. Spelling matters — the mark and packages wear this.`
      : `Next we lock the brand name ${name} will wear on the logo. Confirm it when you're ready.`,
    media: {
      kind: "text",
      title: "2. Brand name",
      body: snap.confirmedName ?? snap.projectName,
      ctaLabel: "Open name workshop",
      ctaHref: snap.nameHref,
    },
  });

  // Logo
  beats.push({
    id: "logo-show",
    stageId: "logo",
    line: snap.logoSvg
      ? `Here's the approved mark for ${name}. Design Studio builds the system around this — not the other way around.`
      : `Logo Workshop is next: generate directions, then approve one mark before Design Studio.`,
    media: snap.logoSvg
      ? {
          kind: "logo",
          title: "3. Logo Workshop",
          svg: snap.logoSvg,
          svgOnDark: snap.logoSvgOnDark,
          ctaLabel: "Open Logo Workshop",
          ctaHref: snap.logoHref,
        }
      : {
          kind: "cta",
          title: "3. Logo Workshop",
          body: "No approved logo yet.",
          ctaLabel: "Open Logo Workshop",
          ctaHref: snap.logoHref,
        },
  });

  // Design — identity
  beats.push({
    id: "design-identity",
    stageId: "design",
    line: snap.identityHtml
      ? `This is the Brand Identity System you selected — palette, type, and UI language from the strategy.`
      : `In Design Studio we choose an identity system grounded in your strategy, then applications.`,
    media: snap.identityHtml
      ? {
          kind: "html",
          title: "4. Brand identity",
          html: snap.identityHtml,
          ctaLabel: "Open Design Studio",
          ctaHref: snap.designHref,
        }
      : {
          kind: "cta",
          title: "4. Design Studio",
          body: "Identity system not selected yet.",
          ctaLabel: "Open Design Studio",
          ctaHref: snap.designHref,
        },
  });

  if (snap.landingHtml) {
    beats.push({
      id: "design-landing",
      stageId: "design",
      line: `Here's the landing page mockup — the identity applied to a real page, with copy from the brief.`,
      media: {
        kind: "html",
        title: "Landing page",
        html: snap.landingHtml,
        ctaLabel: "Open Design Studio",
        ctaHref: snap.designHref,
      },
    });
  }

  if (snap.deckHtml) {
    beats.push({
      id: "design-deck",
      stageId: "design",
      line: `And the brand deck — the story slides built from the same system and strategy.`,
      media: {
        kind: "html",
        title: "Brand deck",
        html: snap.deckHtml,
        ctaLabel: "Open Design Studio",
        ctaHref: snap.designHref,
      },
    });
  }

  if (snap.channelLabels.length) {
    beats.push({
      id: "design-channels",
      stageId: "design",
      line: `Channel templates — SMS, email, ads, and print — carry the same identity into everyday touchpoints.`,
      media: {
        kind: "checklist",
        title: "Channel templates",
        items: snap.channelLabels,
        ctaLabel: "Open Design Studio",
        ctaHref: snap.designHref,
      },
    });
  }

  // Handover
  beats.push({
    id: "handover",
    stageId: "handover",
    line: snap.packageReady
      ? `Your Brand Handover package is ready — identity, landing, deck, and channels from strategy. You can download files or share a private client link.`
      : `Brand Handover unlocks when all package finals are chosen. Until then we keep building in Design Studio.`,
    media: {
      kind: "checklist",
      title: "5. Brand Handover",
      items: [
        { label: "Brand Identity System", ready: Boolean(snap.identityHtml) },
        { label: "Landing page", ready: Boolean(snap.landingHtml) },
        { label: "Brand deck", ready: Boolean(snap.deckHtml) },
        ...snap.channelLabels,
      ],
      ctaLabel: "Open Brand Handover",
      ctaHref: snap.handoverHref,
    },
  });

  // Content
  beats.push({
    id: "content",
    stageId: "content",
    line: snap.contentReady
      ? `Content Studio has a month of posts ready — the brand put to work from your real photos, still grounded in strategy.`
      : `After the package is complete, Content Studio builds a month of posts. That's when this journey is fully done.`,
    media: {
      kind: "cta",
      title: "6. Content Studio",
      body: snap.contentReady
        ? "Month of posts is ready to review."
        : "Unlocks after the full Brand Handover package.",
      ctaLabel: "Open Content Studio",
      ctaHref: snap.contentHref,
    },
  });

  beats.push({
    id: "close",
    stageId: "handover",
    line: `That's the walkthrough for ${name}. Use Leave to go back to the project pages if you want to edit anything. Ask me more questions anytime before you go.`,
    media: {
      kind: "text",
      title: "Thanks for joining",
      body: "This call only presents what you've already built. Edit on the normal pages anytime.",
      ctaLabel: "Back to project",
      ctaHref: `/projects/${projectId}`,
    },
  });

  const current = agenda.find((a) => a.status === "current") ?? agenda.find((a) => a.status === "todo");
  const currentId = current ? stageIdFromJourney(current.id) : "strategy";
  let startBeatIndex = beats.findIndex((b) => b.stageId === currentId && b.id !== "welcome");
  if (startBeatIndex < 0) startBeatIndex = 0;

  return {
    projectId,
    projectName: snap.projectName,
    agenda,
    beats,
    startBeatIndex,
  };
}

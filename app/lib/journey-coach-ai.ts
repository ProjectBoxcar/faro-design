import "server-only";
import { generateStrategyText, hasApiKey, MODELS } from "@/lib/ai";
import { listAssets } from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { getProject, getSections } from "@/lib/queries";
import { hasConfirmedBrandName } from "@/lib/naming-propose";
import { primaryActionFromJourney, buildProjectJourney } from "@/lib/sidebar-journey";
import {
  coachTipFromPath,
  type CoachScene,
  type CoachTip,
} from "@/lib/journey-coach-pure";
import {
  FARO_BRAND_PERSONALITY,
  isFaroMood,
  moodForScene,
  type FaroMood,
} from "@/lib/faro-persona";
import { hasApprovedLogo } from "@/lib/studio";
import { translate } from "@/lib/i18n/messages";

export type CoachAiRequest = {
  pathname: string;
  /** Optional freeform question from the owner */
  question?: string | null;
  /** UI language — Faro answers in this language */
  locale?: "en" | "es" | null;
  /** Hover explain: control under the cursor; call = video-call Q&A */
  mode?: "guide" | "hover" | "call" | null;
  hover?: {
    label?: string | null;
    href?: string | null;
    tag?: string | null;
    role?: string | null;
    anchor?: string | null;
  } | null;
};

export type CoachAiResponse = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHrefTemplate?: string;
  /** Face / emotional beat for the portrait */
  mood: FaroMood;
  source: "ai" | "fallback";
  scene: CoachScene | "hidden";
  aiAvailable: boolean;
};

const FARO_SYSTEM = `You are Faro — ${FARO_BRAND_PERSONALITY.role} inside the Faro Design product.

BRAND YOU SERVE (non-negotiable):
- Promise: "${FARO_BRAND_PERSONALITY.promise}"
- Positioning: "${FARO_BRAND_PERSONALITY.kicker}"
- Palette soul: paper cream, deep teal, coral orange accent — calm coast, not neon SaaS.
- Personality traits: ${FARO_BRAND_PERSONALITY.traits.join("; ")}.

WHO YOU ARE:
- Faro is a living lighthouse beacon with a friendly robot face — lamp-eyes that look and blink, steady voice from the tower.
- Warm, wise, a bit mechanical-charming (like a trusted guide light), never cold corporate.
- You SPEAK face-to-face. Not a tip card. Not a bot disclaimer. Never "As an AI".
- Owner is captain; you keep the light. Strategy first, then the assets.

HOW YOU TALK:
${FARO_BRAND_PERSONALITY.voiceRules.map((r) => `- ${r}`).join("\n")}
- Never invent business facts — only use context given.
- Never engineer jargon. Say "design helper", "client link", "files for product teams", "strategy essentials".
- Nothing final until they approve.

Journey: plain questions → strategy essentials → brand name → logo → design studio → brand handover → content.

MOOD (pick one that matches what you say):
- calm — steady orientation, hub, routine guidance
- thinking — weighing options (name, logo, design choices)
- encouraging — start, welcome, "you've got this", content
- careful — setup/keys, risks, don't rush, soft warnings
- proud — handover complete, package ready, real progress

Output ONLY valid JSON (no markdown fences):
{"title":"2-5 words beat","body":"spoken first-person, max ~70 words","mood":"calm|thinking|encouraging|careful|proud","ctaLabel":"optional short button or omit"}
No bullets. No emojis.`;

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function fallbackResponse(
  tip: CoachTip | { scene: "hidden" },
  aiAvailable: boolean
): CoachAiResponse {
  if (tip.scene === "hidden") {
    return {
      title: "",
      body: "",
      mood: "calm",
      source: "fallback",
      scene: "hidden",
      aiAvailable,
    };
  }
  return {
    title: tip.title,
    body: tip.body,
    ctaLabel: tip.ctaLabel,
    ctaHrefTemplate: tip.ctaHrefTemplate,
    mood: moodForScene(tip.scene),
    source: "fallback",
    scene: tip.scene,
    aiAvailable,
  };
}

function buildContextBlock(pathname: string, projectId: string | null): string {
  const lines: string[] = [`Path: ${pathname}`];
  if (!projectId) {
    lines.push("No project open (welcome / start / settings).");
    return lines.join("\n");
  }
  const project = getProject(projectId);
  if (!project) {
    lines.push(`Project id ${projectId} not found.`);
    return lines.join("\n");
  }
  lines.push(`Project name: ${project.name}`);
  if (project.client_name) lines.push(`Client: ${project.client_name}`);
  if (project.greenfield) lines.push("New brand — no existing materials.");

  try {
    const journey = buildProjectJourney(projectId);
    const current = journey.stages.find((s) => s.status === "current");
    const done = journey.stages.filter((s) => s.status === "done").map((s) => s.name);
    const locked = journey.stages.filter((s) => s.status === "locked").map((s) => s.name);
    lines.push(`Progress: ${journey.overall.done}/${journey.overall.total} major stages done.`);
    if (current) {
      lines.push(`Current stage: ${current.name} — ${current.detail}`);
    }
    if (done.length) lines.push(`Done: ${done.join("; ")}`);
    if (locked.length) lines.push(`Still locked: ${locked.join("; ")}`);
    for (const s of journey.stages) {
      lines.push(`Stage ${s.name}: ${s.status} (${s.detail})`);
    }
    const primary = primaryActionFromJourney(projectId);
    if (primary) {
      lines.push(`Primary next: ${primary.name} — ${primary.detail} (href ${primary.href})`);
    }
  } catch {
    lines.push("Journey status unavailable.");
  }

  try {
    const filled = getSections(projectId).filter(
      (r) => r.status === "draft" || r.status === "complete" || r.status === "client_submitted"
    ).length;
    lines.push(`Strategy sections with content: ${filled}`);
  } catch {
    /* ignore */
  }

  try {
    lines.push(`Name confirmed: ${hasConfirmedBrandName(projectId) ? "yes" : "no"}`);
    lines.push(`Logo approved: ${hasApprovedLogo(projectId) ? "yes" : "no"}`);
    const assets = listAssets(projectId);
    lines.push(
      `Identity selected: ${assets.some((a) => a.kind === "design_system" && a.selected) ? "yes" : "no"}`
    );
    lines.push(
      `Landing selected: ${assets.some((a) => a.kind === "landing_page" && a.selected) ? "yes" : "no"}`
    );
    lines.push(`Deck selected: ${assets.some((a) => a.kind === "deck" && a.selected) ? "yes" : "no"}`);
    const issue = finalDeliverableIssue(assets);
    lines.push(
      issue
        ? `Brand package ready: no — ${issue}`
        : "Brand package ready: yes (identity, landing, deck, channels)"
    );
  } catch {
    /* optional enrichment */
  }

  return lines.join("\n");
}

/**
 * AI-powered coach line for a path (and optional owner question).
 * Falls back to static wise tips when no strategy key or on model failure.
 */
export async function generateCoachGuidance(
  input: CoachAiRequest
): Promise<CoachAiResponse> {
  const pathname = (input.pathname || "/").split("?")[0] || "/";
  const localeEarly = input.locale === "es" ? "es" : "en";
  const tip = coachTipFromPath(pathname, localeEarly);
  const aiAvailable = hasApiKey();

  if (tip.scene === "hidden") {
    return fallbackResponse(tip, aiAvailable);
  }

  if (!aiAvailable) {
    return {
      ...fallbackResponse(tip, false),
      body: tip.body + translate(localeEarly, "coach.noKeyHint"),
    };
  }

  const projectId =
    pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const context = buildContextBlock(pathname, projectId);
  const question = (input.question ?? "").trim().slice(0, 400);
  const locale = input.locale === "es" ? "es" : "en";
  const langLine =
    locale === "es"
      ? "LANGUAGE: Speak entirely in Spanish (Spain/LatAm neutral). title, body, ctaLabel all in Spanish."
      : "LANGUAGE: Speak entirely in English.";

  const isHover = input.mode === "hover";
  const isCallQa =
    (input.mode === "call" || tip.scene === "call") && Boolean(question);
  const hover = input.hover;

  const hoverSystem = `${FARO_SYSTEM}

HOVER MODE (control under cursor):
- You have COMPLETE product knowledge of Faro Design.
- Explain THIS control: what it does, why it matters in the journey, what happens next, any caution.
- Short: 2 crisp sentences max (~55 words). Clear. Insightful. Never vague, never "something nice", never "check the next page".
- Prefer concrete Faro facts: stages, gates (approve, apply edits), lanes (strategy/logo/design), package vs client link.
- title = 2-5 words naming the control's role; body = the insight.`;

  const callSystem = `You are Faro on a live video call inside Faro Design. Answer like a clear human guide.

RULES:
- Answer the owner's question DIRECTLY in sentence one. Yes/no when the question is yes/no.
- Use ONLY the Live context facts (stage status, logo approved, package ready, etc.). Never invent assets.
- Plain speech for reading aloud. No poetry, no lighthouse metaphors, no "As an AI".
- 2–4 short sentences, max ~80 words in "body". "title" = 2–4 words.
- If something is missing, say exactly what to open next (Logo Workshop, Design Studio, Brand Handover, Content Studio).
- Output ONLY JSON: {"title":"...","body":"...","mood":"calm|thinking|encouraging|careful|proud"}`;

  const userPrompt = isHover
    ? [
        langLine,
        "",
        "The owner is pointing at this control:",
        `label: ${hover?.label ?? "(unknown)"}`,
        `tag: ${hover?.tag ?? ""}`,
        `href: ${hover?.href ?? ""}`,
        `anchor: ${hover?.anchor ?? ""}`,
        `role: ${hover?.role ?? ""}`,
        "",
        "App context:",
        context,
        "",
        "Explain it with full Faro product knowledge — short, clear, insightful.",
      ]
        .filter(Boolean)
        .join("\n")
    : isCallQa
      ? [
          langLine,
          "",
          "You are on a live Faro Call presenting this project.",
          "Live context:",
          context,
          "",
          `Owner's question: ${question}`,
          "",
          "Answer clearly and directly. First sentence must address the question.",
        ].join("\n")
      : [
          langLine,
          "",
          "Static seed for this screen (improve or rewrite in your voice; keep intent; translate if needed):",
          `title: ${tip.title}`,
          `body: ${tip.body}`,
          tip.ctaLabel ? `suggestedCta: ${tip.ctaLabel}` : null,
          "",
          "Live context:",
          context,
          "",
          question
            ? `The owner asks: ${question}\nAnswer the question directly first, then one practical next step.`
            : "No freeform question — give the best guidance for this screen right now.",
        ]
          .filter(Boolean)
          .join("\n");

  try {
    const { text } = await generateStrategyText({
      model: MODELS.parsing,
      maxTokens: isHover ? 200 : isCallQa ? 360 : 280,
      system: isHover ? hoverSystem : isCallQa ? callSystem : FARO_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    const parsed = extractJsonObject(text);
    const title =
      typeof parsed?.title === "string" && parsed.title.trim()
        ? parsed.title.trim().slice(0, 48)
        : tip.title;
    const body =
      typeof parsed?.body === "string" && parsed.body.trim()
        ? parsed.body.trim().slice(0, isCallQa ? 560 : 420)
        : tip.body;
    const ctaLabel =
      typeof parsed?.ctaLabel === "string" && parsed.ctaLabel.trim()
        ? parsed.ctaLabel.trim().slice(0, 40)
        : tip.ctaLabel;
    const mood: FaroMood = isFaroMood(parsed?.mood)
      ? parsed.mood
      : moodForScene(tip.scene);

    return {
      title,
      body,
      ctaLabel,
      ctaHrefTemplate: tip.ctaHrefTemplate,
      mood,
      source: "ai",
      scene: tip.scene,
      aiAvailable: true,
    };
  } catch {
    return fallbackResponse(tip, true);
  }
}

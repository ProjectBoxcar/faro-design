import "server-only";
import { generateStrategyText, hasApiKey, MODELS } from "@/lib/ai";
import { getProject, getSections } from "@/lib/queries";
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

export type CoachAiRequest = {
  pathname: string;
  /** Optional freeform question from the owner */
  question?: string | null;
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
    lines.push(`Progress: ${journey.overall.done}/${journey.overall.total} major stages done.`);
    if (current) {
      lines.push(`Current stage: ${current.name} — ${current.detail}`);
    }
    if (done.length) lines.push(`Done: ${done.join("; ")}`);
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
  const tip = coachTipFromPath(pathname);
  const aiAvailable = hasApiKey();

  if (tip.scene === "hidden") {
    return fallbackResponse(tip, aiAvailable);
  }

  if (!aiAvailable) {
    return {
      ...fallbackResponse(tip, false),
      body:
        tip.body +
        " When you add a Claude key in Settings, I can talk with you live — until then, I’ll keep the map steady.",
    };
  }

  const projectId =
    pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const context = buildContextBlock(pathname, projectId);
  const question = (input.question ?? "").trim().slice(0, 400);

  const userPrompt = [
    "Static seed for this screen (improve or rewrite in your voice; keep intent):",
    `title: ${tip.title}`,
    `body: ${tip.body}`,
    tip.ctaLabel ? `suggestedCta: ${tip.ctaLabel}` : null,
    "",
    "Live context:",
    context,
    "",
    question
      ? `The owner asks: ${question}\nAnswer wisely for this moment in the journey.`
      : "No freeform question — give the best guidance for this screen right now.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { text } = await generateStrategyText({
      model: MODELS.parsing,
      maxTokens: 280,
      system: FARO_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    const parsed = extractJsonObject(text);
    const title =
      typeof parsed?.title === "string" && parsed.title.trim()
        ? parsed.title.trim().slice(0, 48)
        : tip.title;
    const body =
      typeof parsed?.body === "string" && parsed.body.trim()
        ? parsed.body.trim().slice(0, 420)
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

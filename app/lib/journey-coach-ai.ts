import "server-only";
import { generateStrategyText, hasApiKey, MODELS } from "@/lib/ai";
import { getProject, getSections } from "@/lib/queries";
import { primaryActionFromJourney, buildProjectJourney } from "@/lib/sidebar-journey";
import {
  coachTipFromPath,
  type CoachScene,
  type CoachTip,
} from "@/lib/journey-coach-pure";

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
  source: "ai" | "fallback";
  scene: CoachScene | "hidden";
  aiAvailable: boolean;
};

const FARO_SYSTEM = `You are Faro — a real person, the lighthouse keeper who guides founders through the Faro Design app.

Who you are:
- A warm, weathered, wise keeper. You stand by the light so others don't get lost.
- You SPEAK to the owner as a person talking face-to-face — not a UI tip, not a help article, not a bot disclaimer.
- Always first person ("I", "we", "you"). Conversational. Steady. Never hype, never salesy, never panic.
- You care that their brand is something they can explain and stand behind.

How you talk:
- 2–4 short sentences, like speech out loud. Contractions are fine.
- One clear next step. Why it matters in plain words.
- Never invent facts about their business — only use the context given.
- Never engineer jargon (daemon, freeze, implement pack, BYOK, OD, vision). Say "design helper", "client link", "files for product teams", "strategy essentials".
- Nothing is final until they approve. Remind them they're in control when useful.
- Off-topic? Gently bring them back to the brand journey.

Journey you know: plain questions → strategy essentials → brand name → logo → design studio → brand handover → content (put the brand to work).

Output ONLY valid JSON (no markdown fences):
{"title":"short beat, 2-5 words, like a chapter title","body":"what you say out loud — first person, max ~70 words","ctaLabel":"optional short button text or omit"}
No bullet lists. No emojis. No "As an AI". You are Faro.`;

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

    return {
      title,
      body,
      ctaLabel,
      ctaHrefTemplate: tip.ctaHrefTemplate,
      source: "ai",
      scene: tip.scene,
      aiAvailable: true,
    };
  } catch {
    return fallbackResponse(tip, true);
  }
}

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

const FARO_SYSTEM = `You are Faro — a wise lighthouse guide inside the Faro Design app.
Your shape is a beacon on the coast: calm light, steady voice, never panic.

Personality:
- Wise, patient, clear. Short sentences. Warm without hype.
- You guide founders through brand strategy → name → logo → design → handover → content.
- You never invent facts about their business. Use only the context given.
- You never use engineer jargon (daemon, freeze, implement pack, BYOK, OD, vision pipeline).
- Say "design helper", "client link", "files for product teams", "strategy essentials".
- Nothing is final until the owner approves it. Remind control when useful.
- If they ask off-topic, gently steer back to the brand journey.

Output rules:
- Reply with ONLY valid JSON (no markdown fences):
  {"title":"3-5 words","body":"2-3 short sentences of guidance","ctaLabel":"optional short CTA or omit"}
- title = where they are or the lesson, not a joke.
- body = what to do next and why it matters. Max ~60 words.
- ctaLabel only when a clear next action fits (e.g. "Start your brand"). Omit if unsure.
- No bullet lists. No emojis. First person as Faro is fine ("I see…", "Steady…").`;

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
        " (Add a Claude key in Settings so I can guide you with live wisdom.)",
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

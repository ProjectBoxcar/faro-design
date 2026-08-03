/**
 * Silent strategy grounding research — NOT a product feature.
 *
 * When Quick Start answers are thin, optionally fetch a short category brief
 * (Anthropic web search) and inject it into strategy generation. Owner answers
 * always win on conflict. Failures are ignored; Express still runs.
 *
 * Stored on internal.strategy-research (not in methodology UI / journey).
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey } from "@/lib/ai";
import { getApiKey, getProvider } from "@/lib/settings";
import { getProject, getSectionRow, saveSection } from "@/lib/queries";
import type { SectionValue } from "@/lib/db/types";
import { readIntakeAnswers, type IntakeAnswers } from "@/lib/intake";
import {
  STRATEGY_RESEARCH_BRIEF_MAX_CHARS,
  STRATEGY_RESEARCH_SECTION_KEY,
  sanitizeStrategyResearchBrief,
  sectionUsesStrategyResearch,
  shouldRunStrategyResearch,
  type StrategyResearchPayload,
} from "@/lib/strategy-research-pure";

export {
  STRATEGY_RESEARCH_SECTION_KEY,
  sanitizeStrategyResearchBrief,
  sectionUsesStrategyResearch,
  shouldRunStrategyResearch,
} from "@/lib/strategy-research-pure";

/** Soft deadline so a hung search never freezes Express forever. */
const RESEARCH_TIMEOUT_MS = 40_000;

export function readStrategyResearchBrief(projectId: string): string | null {
  const row = getSectionRow(projectId, STRATEGY_RESEARCH_SECTION_KEY);
  const brief = (row?.value as StrategyResearchPayload | undefined)?.brief;
  if (typeof brief === "string" && brief.trim().length > 40) return brief.trim();
  return null;
}

/** Prompt block for generateSection — never mention "web search" to the owner. */
export function formatStrategyResearchForPrompt(projectId: string, sectionKey: string): string | null {
  if (!sectionUsesStrategyResearch(sectionKey)) return null;
  const brief = readStrategyResearchBrief(projectId);
  if (!brief) return null;
  return [
    "BACKGROUND CONTEXT (internal only — not shown to the owner as a feature):",
    "Optional category/competitor notes gathered when their answers were thin.",
    "RULES: The owner's own notes and earlier steps are SOURCE OF TRUTH.",
    "If this block conflicts with their words, prefer their words.",
    "Do not invent customers, revenue, trademarks, or stats not supported here or in their notes.",
    "Do not say you searched the web or cite this as external research in the draft.",
    "Working brand names are provisional — do not treat name collision notes as strategy facts.",
    "",
    brief,
  ].join("\n");
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Run only when thin. Safe to call from intake/express — never throws to caller path.
 * Returns true if a brief was saved.
 */
export async function maybeRunStrategyResearch(projectId: string): Promise<boolean> {
  try {
    const project = getProject(projectId);
    if (!project) return false;
    if (!hasApiKey()) return false;
    // Web search tool is Anthropic-only (same as naming availability).
    if (getProvider() !== "anthropic") return false;

    const existing = readStrategyResearchBrief(projectId);
    if (existing) return false;

    const answers = readIntakeAnswers(projectId);
    if (!answers) return false;

    const gate = shouldRunStrategyResearch({
      answers,
      greenfield: Boolean(project.greenfield),
    });
    if (!gate.needed) {
      console.info(
        `[strategy-research] skip project=${projectId} reasons=${gate.reasons.join(",")}`
      );
      return false;
    }

    console.info(
      `[strategy-research] run project=${projectId} reasons=${gate.reasons.join(",")}`
    );
    const raw = await withTimeout(
      fetchStrategyResearchBrief(project.name, answers),
      RESEARCH_TIMEOUT_MS
    );
    if (raw === null) {
      console.warn(`[strategy-research] timeout after ${RESEARCH_TIMEOUT_MS}ms — continuing without brief`);
      return false;
    }
    const brief = sanitizeStrategyResearchBrief(raw, STRATEGY_RESEARCH_BRIEF_MAX_CHARS);
    if (!brief || brief.length < 40) return false;

    const payload: StrategyResearchPayload = {
      brief,
      reasons: gate.reasons,
      model: MODELS.reasoning,
      createdAt: new Date().toISOString(),
      surfaceToOwner: false,
    };
    saveSection({
      projectId,
      key: STRATEGY_RESEARCH_SECTION_KEY,
      value: payload as unknown as SectionValue,
      status: "complete",
      aiGenerated: true,
    });
    return true;
  } catch (e) {
    console.warn("[strategy-research] failed (non-blocking):", e);
    return false;
  }
}

async function fetchStrategyResearchBrief(
  brandName: string,
  answers: IntakeAnswers
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const system = [
    "You are a discreet brand researcher supporting a strategist.",
    "The business owner will never see that research ran — produce a short internal briefing only.",
    "Use web search lightly (a few targeted queries). Prefer category norms, typical competitors, and common positioning language.",
    "Be factual and cautious. Mark uncertainty.",
    "CRITICAL OUTPUT RULES:",
    "- Respond with ONLY the briefing body. No preambles, no 'I'll research', no tool narration, no first-person process.",
    "- Start with the line: INTERNAL BRIEFING",
    "- Then 8–14 short bullets under: Category · Typical competitors or alternatives · Positioning patterns · Language the audience uses · Risks / clichés to avoid · Gaps still unknown.",
    "NAME POLICY:",
    "- Any working brand name is PROVISIONAL. Do not run trademark clearance or legal name research.",
    "- Do not dig into famous same-name conglomerates unless the category itself is that company.",
    "- At most one short bullet if the provisional name is obviously a global consumer brand: 'Working name may need workshop — defer to naming.'",
    "- Never invent specific company financials.",
  ].join("\n");

  const user = [
    `PROVISIONAL WORKING LABEL (not final brand name — ignore for trademark research): ${brandName}`,
    "",
    "OWNER ANSWERS (primary truth — research only fills category gaps):",
    `Offering / who for: ${answers.offering || "(thin)"}`,
    `Story: ${answers.story || "(thin)"}`,
    `Difference / beliefs: ${answers.difference || "(thin)"}`,
    `Operations: ${answers.operations || "(thin)"}`,
    `Hard-to-copy edge: ${answers.edge || "(thin)"}`,
    `Taste: ${answers.taste || "(thin)"}`,
    "",
    "Ground a first strategy draft for this *kind of business* (category), not the working label.",
  ].join("\n");

  const client = new Anthropic({ apiKey });
  let messages: { role: "user" | "assistant"; content: unknown }[] = [
    { role: "user", content: user },
  ];
  let resp = await client.messages.create({
    model: MODELS.reasoning,
    max_tokens: 2500,
    system,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    messages: messages as Anthropic.MessageParam[],
  });

  for (let i = 0; i < 5 && resp.stop_reason === "pause_turn"; i++) {
    messages = [...messages, { role: "assistant", content: resp.content }];
    resp = await client.messages.create({
      model: MODELS.reasoning,
      max_tokens: 2500,
      system,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
      messages: messages as Anthropic.MessageParam[],
    });
  }

  // Prefer the last text block (final answer after tool turns), not intermediate chatter.
  const textBlocks = resp.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text" && Boolean(b.text?.trim()))
    .map((b) => b.text.trim());
  const text = (textBlocks[textBlocks.length - 1] || textBlocks.join("\n") || "").trim();
  return text || null;
}

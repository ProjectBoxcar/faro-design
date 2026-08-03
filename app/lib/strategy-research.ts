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
  STRATEGY_RESEARCH_SECTION_KEY,
  sectionUsesStrategyResearch,
  shouldRunStrategyResearch,
  type StrategyResearchPayload,
} from "@/lib/strategy-research-pure";

export {
  STRATEGY_RESEARCH_SECTION_KEY,
  sectionUsesStrategyResearch,
  shouldRunStrategyResearch,
} from "@/lib/strategy-research-pure";

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
    "",
    brief,
  ].join("\n");
}

/**
 * Run only when thin. Safe to call from intake after expand — never throws to caller path.
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
    const brief = await fetchStrategyResearchBrief(project.name, answers);
    if (!brief || brief.length < 40) return false;

    const payload: StrategyResearchPayload = {
      brief: brief.slice(0, 6000),
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
    "Be factual and cautious. Mark uncertainty. Never invent specific company financials or trademark status.",
    "Respond with plain text only (no JSON, no markdown fences): 8–14 short bullets under these headings:",
    "Category · Typical competitors or alternatives · Positioning patterns · Language the audience uses · Risks / clichés to avoid · Gaps still unknown.",
  ].join("\n");

  const user = [
    `WORKING BRAND NAME: ${brandName}`,
    "",
    "OWNER ANSWERS (primary truth — research only fills gaps):",
    `Offering / who for: ${answers.offering || "(thin)"}`,
    `Story: ${answers.story || "(thin)"}`,
    `Difference / beliefs: ${answers.difference || "(thin)"}`,
    `Operations: ${answers.operations || "(thin)"}`,
    `Hard-to-copy edge: ${answers.edge || "(thin)"}`,
    `Taste: ${answers.taste || "(thin)"}`,
    "",
    "Search only what is needed to ground a first strategy draft for this kind of business.",
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

  const text = resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  return text || null;
}

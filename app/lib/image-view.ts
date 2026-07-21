import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { ai_generations } from "@/lib/db/schema";
import { MODELS } from "@/lib/ai";
import { getProviderConfig } from "@/lib/settings";
import { extractJson } from "@/lib/json";
import { getProject, getSectionRow, saveSection } from "@/lib/queries";

// The Image pillar's fast path: an AI perception audit instead of a customer
// survey. HONESTY RULES (load-bearing, see also generationBlockedReason):
// - We NEVER write image.results — that section is verbatim customer answers,
//   and inventing them would poison the pillar. It stays empty in this mode.
// - The audit fills image.pattern-analysis + image.sample-limitation directly,
//   grounded in public signals found via web search (reviews, mentions, sector
//   perception) or, when no footprint exists, reasoned openly from the market
//   context — and it says which of those it did, inside the content itself, so
//   the label survives into every downstream synthesis and the brief.
// - Real survey answers pasted later replace all of this (the upgrade path).

const CONTEXT_READS = [
  "reality.service",
  "reality.market-context",
  "reality.ideal-client",
  "reality.differentiator",
  "identity.self-perception",
  "identity.beliefs",
  "identity.golden-circle",
] as const;

export type ImageViewState = "surveyed" | "inferred" | "empty";

// What the Image pillar currently rests on: real answers beat inference,
// inference beats nothing.
export function imageViewState(projectId: string): ImageViewState {
  const results = getSectionRow(projectId, "image.results");
  const hasResults =
    results?.value && Object.values(results.value as Record<string, unknown>).some((v) => Array.isArray(v) && v.length > 0);
  if (hasResults) return "surveyed";
  const pattern = getSectionRow(projectId, "image.pattern-analysis");
  if (pattern?.ai_generated && pattern.value && Object.keys(pattern.value as Record<string, unknown>).length > 0)
    return "inferred";
  return "empty";
}

type ParsedAudit = {
  strengths?: { strength: string; evidence: string }[];
  wayOfWorking?: string;
  improvements?: { area: string; evidence: string }[];
  recommendation?: string;
  groundedness?: string;
  signals?: string[];
  limitation?: string;
};

export async function runImageOutsideView(projectId: string): Promise<ImageViewState> {
  const project = getProject(projectId);
  if (!project) throw new Error("Unknown project");
  if (imageViewState(projectId) === "surveyed") {
    throw new Error("You already have real survey answers — those beat any AI inference, keep them.");
  }

  const reads: string[] = [];
  const parts: string[] = [
    `Brand: ${project.name}${project.client_name ? ` (${project.client_name})` : ""}`,
  ];
  for (const key of CONTEXT_READS) {
    const row = getSectionRow(projectId, key);
    if (row?.value && Object.keys(row.value as Record<string, unknown>).length > 0) {
      parts.push(`### ${key}\n${JSON.stringify(row.value)}`);
      reads.push(key);
    }
  }
  if (reads.length === 0) {
    throw new Error("There's nothing to infer from yet — fill in the Reality and Identity steps first.");
  }

  const system = [
    "You are a brand-perception researcher producing an OUTSIDE VIEW of how this brand is currently perceived — the job a customer survey would do, done instead from evidence and disciplined reasoning.",
    "Use web search first: look for the brand's reviews, social mentions, directory listings, press, and how customers talk about this sector and its competitors. Ground every claim in what you actually find.",
    "If the brand has little or no public footprint, say so plainly and reason from the market context and ideal-client profile instead: how would this type of buyer most likely perceive a provider like this today? Mark such claims as reasoned, never as observed.",
    "NEVER invent specific customer quotes, named reviewers, ratings, or statistics. Do not flatter: the point of an outside view is finding gaps between how the brand sees itself (the identity claims provided) and how others likely see it.",
    'Respond with ONLY one JSON object: {"strengths":[{"strength","evidence"}], "wayOfWorking": string, "improvements":[{"area","evidence"}], "recommendation": string, "groundedness":"public-signals"|"mixed"|"reasoned-only", "signals":[string], "limitation": string}. "evidence" says where each claim comes from (e.g. "3 Google reviews mention speed" or "reasoned from market context — unverified"). "signals" lists what you actually found (or "no public footprint found"). "limitation" is 2-3 honest sentences on how far to trust this audit.',
  ].join("\n\n");

  const user = [
    "Produce the perception audit for this brand. The identity claims below are the hypotheses to test against the outside view — where do public signals (or disciplined reasoning) support them, and where do they likely diverge?",
    parts.join("\n\n"),
    "Search the web before answering. Return the JSON object now.",
  ].join("\n\n");

  const config = getProviderConfig();
  if (config.provider !== "anthropic") {
    throw new Error("The AI outside view requires the Anthropic provider because it uses web search.");
  }
  if (!config.apiKey) throw new Error("No API key configured — add it in Settings.");
  const client = new Anthropic({ apiKey: config.apiKey });
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  let resp = await client.messages.create({
    model: MODELS.reasoning,
    max_tokens: 4096,
    system,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 10 }],
    messages,
  });
  for (let i = 0; i < 6 && resp.stop_reason === "pause_turn"; i++) {
    messages = [...messages, { role: "assistant", content: resp.content }];
    resp = await client.messages.create({
      model: MODELS.reasoning,
      max_tokens: 4096,
      system,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 10 }],
      messages,
    });
  }

  const text = resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  const parsed = extractJson(text) as ParsedAudit;
  if (!parsed.strengths?.length && !parsed.wayOfWorking) {
    throw new Error("The audit returned nothing usable — try again.");
  }

  const grounded =
    parsed.groundedness === "public-signals"
      ? "grounded in public signals"
      : parsed.groundedness === "mixed"
        ? "partly grounded in public signals, partly reasoned"
        : "reasoned from your market context (no public footprint found)";
  // The provenance label lives IN the content so every downstream synthesis
  // (contrast, key finding) and the designer brief inherit it automatically.
  const sourceTag = `AI-inferred outside view (${grounded}) — not a customer survey.`;

  saveSection({
    projectId,
    key: "image.pattern-analysis",
    value: {
      strengths: (parsed.strengths ?? []).map((s) => ({ strength: s.strength, mentions: s.evidence })),
      "way-of-working": `${sourceTag} ${parsed.wayOfWorking ?? ""}`.trim(),
      improvements: (parsed.improvements ?? []).map((i) => ({ area: i.area, mentions: i.evidence })),
      recommendation: parsed.recommendation
        ? `${parsed.recommendation} (inferred — not measured by a survey)`
        : "Not measurable without a real survey.",
    },
    status: "draft",
    aiGenerated: true,
  });

  saveSection({
    projectId,
    key: "image.sample-limitation",
    value: {
      limitation: [
        sourceTag,
        parsed.limitation ?? "",
        parsed.signals?.length ? `Signals reviewed: ${parsed.signals.join("; ")}.` : "",
        "Paste real survey answers into Results anytime — they replace this inference and make the whole pillar stronger.",
      ]
        .filter(Boolean)
        .join(" "),
    },
    status: "draft",
    aiGenerated: true,
  });

  // Same provenance ledger as every other generation.
  db.insert(ai_generations)
    .values({
      id: nanoid(),
      project_id: projectId,
      section_key: "image.pattern-analysis",
      model: MODELS.reasoning,
      reads,
      output: text.slice(0, 20000),
    })
    .run();

  return "inferred";
}

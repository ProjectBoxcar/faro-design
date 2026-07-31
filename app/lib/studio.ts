import "server-only";
import { db } from "@/lib/db";
import { ai_generations } from "@/lib/db/schema";
// Logo Workshop only — OpenAI → Gemini; never OD. See docs/11-ai-lanes.md
import { generateLogoText, hasLogoKey, MODELS } from "@/lib/ai";

import { extractJson } from "@/lib/json";
import {
  getProject,
  getSectionRow,
  insertEvaluation,
  insertStudioAsset,
  listStudioAssets,
  getStudioAsset,
  listEvaluations,
  type StudioAssetRow,
} from "@/lib/queries";
import type { EvalScore } from "@/lib/db/types";
import { nanoid } from "nanoid";
import { sanitizeStudioSvg } from "@/lib/studio-svg";
import { confirmedOrWorkingName, hasConfirmedBrandName } from "@/lib/naming-propose";
import {
  assessLogoBatchDiversity,
  shouldRetryForLogoDiversity,
} from "@/lib/logo-diversity-pure";

// Asset Studio pipeline (see 10-asset-studio.md). Batch 1: the logo workspace.
// Flow per kind: generate candidates → skeptical-judge scoring → auto-discard
// fails → owner chooses a direction → owner APPROVES (the human gate — nothing
// here ever sets "approved").

// The strategy sections every generation call reads — the same compass the
// phase-1 designer brief hands over. Express often leaves system.* empty; we
// still pull Reality / Identity / Communication so logos aren't name-only.
const STRATEGY_READS = [
  "concept",
  "brief.central-pattern",
  "brief.main-tension",
  "brief.constraint",
  "brief.emotional-territory",
  "brief.must-resolve",
  "territory.definition",
  "communication.personality",
  "communication.tone",
  "communication.purpose",
  "communication.promise",
  "reality.differentiator",
  "reality.value-proposition",
  "reality.ideal-client",
  "identity.aspiration",
  "identity.position",
  "system.color",
  "system.typography",
  "system.logo-exploration",
  "system.logo-definition",
] as const;

function sectionHasContent(projectId: string, key: string): boolean {
  const row = getSectionRow(projectId, key);
  if (!row?.value) return false;
  const status = row.status ?? "empty";
  return status === "draft" || status === "complete" || status === "client_submitted";
}

function fieldString(value: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!value) return "";
  for (const k of keys) {
    const v = value[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v) && v.length) {
      const parts = v
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object") {
            const o = item as Record<string, unknown>;
            return String(o.trait ?? o.name ?? o.value ?? o.label ?? "").trim();
          }
          return "";
        })
        .filter(Boolean);
      if (parts.length) return parts.join(", ");
    }
  }
  return "";
}

/** Compact compass so the model can't ignore strategy and just set the name in type. */
function logoDesignBrief(projectId: string, brandName: string): string {
  const concept = getSectionRow(projectId, "concept")?.value as Record<string, unknown> | undefined;
  const pattern = getSectionRow(projectId, "brief.central-pattern")?.value as
    | Record<string, unknown>
    | undefined;
  const tension = getSectionRow(projectId, "brief.main-tension")?.value as
    | Record<string, unknown>
    | undefined;
  const emotion = getSectionRow(projectId, "brief.emotional-territory")?.value as
    | Record<string, unknown>
    | undefined;
  const personality = getSectionRow(projectId, "communication.personality")?.value as
    | Record<string, unknown>
    | undefined;
  const diff = getSectionRow(projectId, "reality.differentiator")?.value as
    | Record<string, unknown>
    | undefined;
  const lines = [
    `Brand name to set in the mark: "${brandName}"`,
    fieldString(concept, "statement") && `Concept statement: ${fieldString(concept, "statement")}`,
    fieldString(concept, "description") &&
      `Concept description: ${fieldString(concept, "description").slice(0, 320)}`,
    fieldString(pattern, "pattern", "text", "summary") &&
      `Central pattern: ${fieldString(pattern, "pattern", "text", "summary")}`,
    fieldString(tension, "tension", "text", "summary", "classification") &&
      `Main tension: ${fieldString(tension, "tension", "text", "summary", "classification")}`,
    fieldString(emotion, "territory", "text", "summary", "feeling") &&
      `Emotional territory: ${fieldString(emotion, "territory", "text", "summary", "feeling")}`,
    fieldString(personality, "traits", "text", "summary") &&
      `Personality: ${fieldString(personality, "traits", "text", "summary").slice(0, 200)}`,
    fieldString(diff, "differentiator", "text", "summary") &&
      `Differentiator: ${fieldString(diff, "differentiator", "text", "summary").slice(0, 200)}`,
  ].filter(Boolean);
  return lines.join("\n");
}

function strategyContext(projectId: string): { context: string; reads: string[] } {
  const parts: string[] = [];
  const reads: string[] = [];
  for (const key of STRATEGY_READS) {
    const row = getSectionRow(projectId, key);
    // Express leaves drafts until full approve — still usable strategy for the logo.
    if (row?.value && (row.status === "complete" || row.status === "draft" || row.status === "client_submitted")) {
      parts.push(`### ${key}\n${JSON.stringify(row.value)}`);
      reads.push(key);
    }
  }
  return { context: parts.join("\n\n"), reads };
}

// The name the wordmarks carry: confirmed workshop name first, else project name.
// Never uses availability-check passes (those are research only).
export function clearedName(projectId: string): string | null {
  return confirmedOrWorkingName(projectId);
}

// True once the owner has approved a logo in the Logo Workshop.
export function hasApprovedLogo(projectId: string): boolean {
  return listStudioAssets(projectId, "logo").some((a) => a.status === "approved");
}

export function getApprovedLogo(projectId: string): StudioAssetRow | null {
  return listStudioAssets(projectId, "logo").find((a) => a.status === "approved") ?? null;
}

// Server-side gate: Logo Workshop opens after the strategy essentials exist
// (draft or complete). New projects must confirm a brand name before first logo
// generate; projects that already have logo work keep access (legacy pilot).
export function studioBlockedReason(projectId: string, kind: StudioAssetRow["kind"]): string | null {
  const project = getProject(projectId);
  if (!project) return "Unknown project";
  if (project.viability === "fail" && !project.viability_override_note) {
    return "Add a documented viability override before opening the Logo Workshop.";
  }
  // Concept + design plan are the spine after express / guided strategy.
  const required = ["concept", "design-plan"];
  for (const key of required) {
    if (!sectionHasContent(projectId, key)) {
      return `Finish the strategy first — the Logo Workshop needs "${key}" drafted.`;
    }
  }
  // Brief signal: at least one strategic-brief finding so the logo has a compass.
  const briefOk =
    sectionHasContent(projectId, "brief.central-pattern") ||
    sectionHasContent(projectId, "brief.main-tension") ||
    sectionHasContent(projectId, "brief.emotional-territory");
  if (!briefOk) {
    return "Finish the strategic brief first — the Logo Workshop needs that direction.";
  }
  if (kind === "logo" && !clearedName(projectId)) {
    return "Give the project a brand name before designing the logo.";
  }
  if (kind === "logo") {
    const hasLogoWork = listStudioAssets(projectId, "logo").some((a) => a.status !== "discarded");
    if (!hasConfirmedBrandName(projectId) && !hasLogoWork) {
      return "Confirm your brand name first — pick one or keep your working title, then generate logos.";
    }
  }
  return null;
}

// Design Studio (full identity system) stays locked until a logo is approved.
export function designStudioBlockedReason(projectId: string): string | null {
  const strategyBlock = studioBlockedReason(projectId, "logo");
  if (strategyBlock) return strategyBlock.replace("Logo Workshop", "Design Studio");
  if (!hasApprovedLogo(projectId)) {
    return "Approve a logo in the Logo Workshop first — Design Studio builds color, type, and mockups around that mark.";
  }
  return null;
}

// Palette hexes from the strategy's color direction, to constrain the SVGs.
// When Express never filled system.color, derive a short set from emotional territory
// so every brand doesn't default to the same black-on-paper wordmark.
function strategyHexes(projectId: string): string[] {
  const row = getSectionRow(projectId, "system.color");
  const palette = (row?.value as Record<string, unknown> | undefined)?.palette;
  const hexes: string[] = [];
  if (Array.isArray(palette)) {
    for (const p of palette as Record<string, string>[]) {
      const raw = typeof p?.value === "string" ? p.value : typeof p?.hex === "string" ? p.hex : "";
      const m = raw.match(/#[0-9a-fA-F]{6}/);
      if (m) hexes.push(m[0].toUpperCase());
    }
  }
  if (hexes.length >= 2) return hexes.slice(0, 6);

  // Lightweight mood → palette when no formal color system exists yet.
  const emotion =
    fieldString(
      getSectionRow(projectId, "brief.emotional-territory")?.value as Record<string, unknown>,
      "territory",
      "text",
      "summary",
      "feeling"
    ) +
    " " +
    fieldString(
      getSectionRow(projectId, "concept")?.value as Record<string, unknown>,
      "statement",
      "description"
    );
  const mood = emotion.toLowerCase();
  if (/warm|human|craft|earth|care|home|community/.test(mood)) {
    return ["#2C1810", "#C45C26", "#F3E6D8", "#F7F1E8"];
  }
  if (/calm|trust|clinical|medical|ocean|cool|precise/.test(mood)) {
    return ["#0B1F2A", "#1F6F8B", "#E8F1F5", "#F5F7F8"];
  }
  if (/bold|power|urban|night|sharp|tech|edge/.test(mood)) {
    return ["#0A0A0A", "#E8E8E8", "#F25C2A", "#FFFFFF"];
  }
  if (/nature|green|growth|fresh|organic/.test(mood)) {
    return ["#14261C", "#2E7D5B", "#E7F0E9", "#F5F1E8"];
  }
  if (/luxury|quiet|editorial|museum|minimal/.test(mood)) {
    return ["#1A1A1A", "#8A7F72", "#F5F1E8", "#FFFFFF"];
  }
  // Still a fallback — but slightly warmer paper so brands aren't identical pure ink.
  return hexes.length ? hexes : ["#161616", "#F5F1E8", "#16514B"];
}

/** Prior logo directions on this project — force the model not to repeat them. */
function priorLogoDirections(projectId: string): string[] {
  return listStudioAssets(projectId, "logo")
    .map((a) => [a.label, a.direction].filter(Boolean).join(" — "))
    .filter(Boolean)
    .slice(0, 12);
}

const LOGO_CRITERIA = [
  { key: "concept-alignment", label: "Concept alignment" },
  { key: "territory-fit", label: "Territory fit" },
  { key: "distinctiveness", label: "Distinctiveness" },
  { key: "legibility-small", label: "Legibility at 16px" },
  { key: "versatility", label: "Versatility light/dark" },
] as const;

type GeneratedMark = {
  label: string;
  direction: string;
  svg: string;
  svgOnDark?: string;
  fonts?: string[];
};

export type StudioGenerateResult = {
  assets: StudioAssetRow[];
  discarded: number;
};

/** Active logo run id per project + cancelled run ids (epoch so cancel can't race a restart). */
const logoRunIds = new Map<string, number>();
const cancelledLogoRunIds = new Set<number>();
let nextLogoRunId = 1;

class LogoGenerationCancelled extends Error {
  constructor() {
    super("Generation stopped.");
    this.name = "LogoGenerationCancelled";
  }
}

function throwIfLogoCancelled(runId: number) {
  if (cancelledLogoRunIds.has(runId)) throw new LogoGenerationCancelled();
}

/** Stop an in-flight logo generate/variations run after the current OD call. */
export function cancelLogoGeneration(projectId: string): void {
  const runId = logoRunIds.get(projectId);
  if (runId != null) cancelledLogoRunIds.add(runId);
}

// Generate wordmark candidates, score them with a separate skeptical judge,
// auto-discard fails, and store the survivors as "candidate" assets.
// `variationsOf` narrows generation to variations of one existing candidate.
// `feedback` is optional owner guidance when refining a liked direction.
export async function generateLogoCandidates(
  projectId: string,
  variationsOf?: string,
  feedback?: string
): Promise<StudioGenerateResult> {
  const runId = nextLogoRunId++;
  logoRunIds.set(projectId, runId);
  try {
    return await generateLogoCandidatesInner(projectId, variationsOf, feedback, runId);
  } finally {
    if (logoRunIds.get(projectId) === runId) logoRunIds.delete(projectId);
    cancelledLogoRunIds.delete(runId);
  }
}

async function generateLogoCandidatesInner(
  projectId: string,
  variationsOf: string | undefined,
  feedback: string | undefined,
  runId: number
): Promise<StudioGenerateResult> {
  const blocked = studioBlockedReason(projectId, "logo");
  if (blocked) throw new Error(blocked);

  if (!hasLogoKey()) {
    throw new Error(
      "No logo AI key — save an OpenAI API key in Settings under graphics (OpenAI-compatible)."
    );
  }

  const name = clearedName(projectId)!;
  const { context, reads } = strategyContext(projectId);
  const hexes = strategyHexes(projectId);
  const brief = logoDesignBrief(projectId, name);
  const prior = priorLogoDirections(projectId);
  // Graphics lane model (OpenAI gpt-4o by default for logos).
  const model = MODELS.logo;

  let memoryBlock = "";
  try {
    const { formatMemoryForPrompt } = await import("@/lib/brand-memory");
    memoryBlock = formatMemoryForPrompt("logo", { excludeProjectId: projectId, limit: 5 });
  } catch {
    /* optional */
  }

  const system = `You are a senior brand designer. Strategy is decided — execute it visually.
The brand name appears in every mark, but the NAME alone is not the design. Structure, letterform,
geometry, weight, and composition must express the concept and emotional territory.
Respond with ONLY one JSON object, no prose or code fences.

DESIGN BRIEF (must drive every candidate):
${brief}

FULL STRATEGY CONTEXT:
${context}${memoryBlock ? `\n\n${memoryBlock}` : ""}`;

  const base = variationsOf ? getStudioAsset(variationsOf) : undefined;
  if (variationsOf && (!base || base.project_id !== projectId)) throw new Error("Unknown asset");

  const ownerFeedback = feedback?.trim();
  const task = base
    ? [
        `The owner likes this logo direction and wants EXACTLY 3 refined variations of it — keep the same core idea and name treatment, but explore meaningfully different executions (weight, spacing, mark treatment, lockup).`,
        `BASE DIRECTION (preserve this identity; refine, do not invent a new brand mark):`,
        JSON.stringify({
          label: base.label,
          direction: base.direction,
          svg: base.payload?.svg,
          svgOnDark: base.payload?.svgOnDark,
        }),
        ownerFeedback
          ? [
              `OWNER FEEDBACK (highest priority after strategy — apply these changes while keeping the liked direction):`,
              ownerFeedback,
              `Every variation must clearly respond to this feedback. Do not ignore it or regenerate unrelated marks.`,
            ].join("\n")
          : `No specific feedback — refine weight, spacing, and mark craft while staying on this direction.`,
      ].join("\n")
    : [
        `Design EXACTLY 3 logo candidates for the brand name "${name}".`,
        `They must look like THREE DIFFERENT BRANDS that share the same strategy — not three font swaps of the same wordmark.`,
        ``,
        `REQUIRED STRUCTURE (one candidate each — do not skip or blend):`,
        `1) "Solid wordmark" — custom letter spacing / weight / case; distinctive type only; NO separate symbol.`,
        `2) "Mark + word" — a simple geometric isotype or monogram beside or above the name; the mark must encode the concept (not a random shape).`,
        `3) "Integrated lockup" — stacked, badge, or letterform where geometry and type interlock (ligature, frame, or cut-out).`,
        ``,
        `Each "direction" field must name a different visual idea tied to the concept (e.g. "compressed industrial monoline", not "modern clean").`,
        prior.length
          ? `DO NOT repeat these prior directions already shown on this project:\n- ${prior.join("\n- ")}`
          : `This is the first round — maximize contrast between the three structures.`,
      ].join("\n");

  const user = `${task}

Constraints for every candidate:
- A complete inline SVG (viewBox, no width/height attributes, no external refs, no <image>, no filters).
- Type-driven or geometric only (no photo, no illustration hatching). Prefer <path> for custom letterforms when it helps distinctiveness; <text> with a Google Font is OK for the wordmark candidate.
- Different Google Font families across the three candidates when using <text> — never the same family for all three.
- Use ONLY these palette hexes: ${JSON.stringify(hexes)} (you may use 1–3 of them per mark; ink-on-paper is not required for every candidate).
- Marks/isotypes: simple geometry (<path>/<rect>/<circle>/<polygon>) that feel specific to THIS brand.
- "svgOnDark" is the same composition recolored for a dark ground.
- label: short human name for the direction (not "Option A").

Return EXACTLY 3 candidates in order (wordmark, mark+word, integrated):
{"candidates":[{"label","direction","svg","svgOnDark","fonts":["Family",...]}, ...]}`;

  // Prefer a full set of 3 usable, structurally diverse marks; retry if short or samey.
  // Track the *actual* engine/model (OpenAI or Gemini fallback) for provenance.
  let candidates: GeneratedMark[] = [];
  let genText = "";
  let usedModel = model;
  let usedEngine: string = "openai-direct";
  const maxAttempts = base ? 2 : 3; // variations: fewer retries; fresh batch: allow diversity retry
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    throwIfLogoCancelled(runId);
    const needMore = candidates.length < 3;
    const diversity = assessLogoBatchDiversity(candidates);
    const needDiversity = !base && shouldRetryForLogoDiversity(diversity);
    if (attempt > 0 && !needMore && !needDiversity) break;

    let retryNote = "";
    if (attempt > 0 && needMore) {
      retryNote = `\n\nRETRY: Return EXACTLY 3 complete candidates with the three REQUIRED STRUCTURES (wordmark / mark+word / integrated). Prior attempt only had ${candidates.length}. Make them visually distinct — not the same layout with a different font.`;
    } else if (attempt > 0 && needDiversity) {
      retryNote = `\n\nRETRY — STRUCTURE DIVERSITY: The last batch looked too similar (${diversity.kinds.join(", ")}). Return EXACTLY 3 candidates that are clearly different structures: (1) solid wordmark only, (2) separate mark + word, (3) integrated lockup/badge/stack. Name each structure in the "direction" field.`;
    }

    const result = await generateLogoText({
      model,
      maxTokens: 9000,
      temperature: base ? 0.75 : 1.0,
      system,
      messages: [{ role: "user", content: user + retryNote }],
    });
    throwIfLogoCancelled(runId);
    genText = result.text;
    usedModel = result.model || model;
    usedEngine = result.engine ?? usedEngine;
    const parsed = extractJson(genText) as { candidates?: GeneratedMark[] };
    candidates = (parsed.candidates ?? []).filter((c) => c?.label && c?.svg).slice(0, 3);

    if (candidates.length >= 3 && !shouldRetryForLogoDiversity(assessLogoBatchDiversity(candidates))) {
      break;
    }
  }
  throwIfLogoCancelled(runId);
  if (candidates.length === 0) throw new Error("Generation returned no usable candidates — try again.");
  if (candidates.length < 3) {
    console.warn(`[studio] logo generation returned ${candidates.length}/3 candidates after retry`);
  }
  const finalDiversity = assessLogoBatchDiversity(candidates);
  if (!base && !finalDiversity.diverseEnough) {
    console.warn(
      `[studio] logo batch still low diversity after retries: ${finalDiversity.kinds.join(", ")}`
    );
  }

  // Provenance, same ledger as strategy drafts — store actual model + engine.
  db.insert(ai_generations)
    .values({
      id: nanoid(),
      project_id: projectId,
      section_key: "studio.logo",
      model: `${usedModel}${usedEngine ? ` (${usedEngine})` : ""}`,
      reads,
      output: genText.slice(0, 20000),
      accepted: true,
    })
    .run();

  throwIfLogoCancelled(runId);

  // Separate judge call so generation can't grade its own homework.
  const judgeSystem = `You are a skeptical design director reviewing wordmark candidates against a
brand strategy. You did NOT design these and gain nothing from approving them. Be harsh: "caveat"
is the default for anything not clearly excellent, "fail" for anything generic, off-strategy, or
technically weak. Respond with ONLY one JSON object.

THE STRATEGY:
${context}`;
  const judgeUser = `Score each candidate on: ${LOGO_CRITERIA.map((c) => c.key).join(", ")}.
Result per criterion: "pass" | "caveat" | "fail" with a one-sentence note.
Overall verdict per candidate: "pass" (usable direction), "caveat" (direction ok, execution needs
work), "fail" (discard). Add a two-sentence summary per candidate.
Penalize "distinctiveness" if a candidate is only the brand name in a default font with no structural idea,
or if all three candidates look like the same wordmark with different typefaces.
Candidates:
${JSON.stringify(candidates.map((c) => ({ label: c.label, direction: c.direction, svg: c.svg })))}
Return: {"scores":[{"label","criteria":[{"criterion","result","note"}],"verdict","summary"}]}`;

  const judgeResult = await generateLogoText({
    model,
    maxTokens: 4096,
    temperature: 0.3,
    system: judgeSystem,
    messages: [{ role: "user", content: judgeUser }],
  });
  throwIfLogoCancelled(runId);
  const judgeText = judgeResult.text;
  const judged = extractJson(judgeText) as {
    scores?: { label: string; criteria?: { criterion: string; result: string; note: string }[]; verdict?: string; summary?: string }[];
  };

  const rows: StudioAssetRow[] = [];
  let discarded = 0;
  for (const c of candidates) {
    const score = (judged.scores ?? []).find((s) => s.label === c.label);
    const verdict = (["pass", "caveat", "fail"].includes(score?.verdict ?? "") ? score!.verdict : "caveat") as
      | "pass"
      | "caveat"
      | "fail";
    const scores: EvalScore[] = [
      { key: "summary", label: "Summary", result: verdict, notes: score?.summary ?? "" },
      ...(score?.criteria ?? []).map((cr) => ({
        key: cr.criterion,
        label: LOGO_CRITERIA.find((k) => k.key === cr.criterion)?.label ?? cr.criterion,
        result: ["pass", "caveat", "fail"].includes(cr.result) ? cr.result : "caveat",
        notes: cr.note ?? "",
      })),
    ];
    const evaluation = insertEvaluation({ projectId, type: "logo", subject: c.label, scores, verdict });

    // Always surface every generated proposal (target: 3). The judge score is
    // advisory on the card — auto-discard hid fails and left only 1–2 options.
    const row = insertStudioAsset({
      projectId,
      kind: "logo",
      label: c.label,
      direction: c.direction ?? null,
      payload: {
        svg: sanitizeStudioSvg(c.svg),
        svgOnDark: c.svgOnDark ? sanitizeStudioSvg(c.svgOnDark) : undefined,
        tokens: {
          fonts: (c.fonts ?? []).slice(0, 4),
          engine: usedEngine,
          model: usedModel,
          ...(base
            ? {
                refinedFrom: base.id,
                refinedFromLabel: base.label,
                ...(ownerFeedback ? { feedback: ownerFeedback.slice(0, 500) } : {}),
              }
            : {}),
        },
      },
      evaluationId: evaluation.id,
      status: "candidate",
      model: usedModel,
    });
    if (verdict === "fail") discarded++; // for UI: "critic flagged N" if we surface it
    rows.push(row);
  }
  return { assets: rows, discarded };
}

// Everything the logo workspace needs in one read.
export function logoWorkspace(projectId: string) {
  const all = listStudioAssets(projectId, "logo");
  const evalById = new Map(listEvaluations(projectId, "logo").map((e) => [e.id, e]));
  return {
    blocked: studioBlockedReason(projectId, "logo"),
    name: clearedName(projectId),
    assets: all.map((a) => ({
      ...a,
      evaluation: a.evaluation_id ? (evalById.get(a.evaluation_id) ?? null) : null,
    })),
  };
}

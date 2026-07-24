import "server-only";
import { db } from "@/lib/db";
import { ai_generations } from "@/lib/db/schema";
import { generateDesignText, hasOpenDesignKey, MODELS } from "@/lib/ai";

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

// Asset Studio pipeline (see 10-asset-studio.md). Batch 1: the logo workspace.
// Flow per kind: generate candidates → skeptical-judge scoring → auto-discard
// fails → owner chooses a direction → owner APPROVES (the human gate — nothing
// here ever sets "approved").

// The strategy sections every generation call reads — the same compass the
// phase-1 designer brief hands over.
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
  "system.color",
  "system.typography",
  "system.logo-exploration",
] as const;

function sectionHasContent(projectId: string, key: string): boolean {
  const row = getSectionRow(projectId, key);
  if (!row?.value) return false;
  const status = row.status ?? "empty";
  return status === "draft" || status === "complete" || status === "client_submitted";
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

// The name the wordmarks carry: a passed naming check when available, else the project name.
export function clearedName(projectId: string): string | null {
  const passed = listEvaluations(projectId, "naming").find((e) => e.verdict === "pass" && e.subject);
  if (passed?.subject) return passed.subject;
  return getProject(projectId)?.name?.trim() || null;
}

// True once the owner has approved a logo in the Logo Workshop.
export function hasApprovedLogo(projectId: string): boolean {
  return listStudioAssets(projectId, "logo").some((a) => a.status === "approved");
}

export function getApprovedLogo(projectId: string): StudioAssetRow | null {
  return listStudioAssets(projectId, "logo").find((a) => a.status === "approved") ?? null;
}

// Server-side gate: Logo Workshop opens after the strategy essentials exist
// (draft or complete). Naming checks are preferred but not required — the
// project name is used for wordmarks when no availability check has passed.
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
function strategyHexes(projectId: string): string[] {
  const row = getSectionRow(projectId, "system.color");
  const palette = (row?.value as Record<string, unknown> | undefined)?.palette;
  const hexes: string[] = [];
  if (Array.isArray(palette)) {
    for (const p of palette as Record<string, string>[]) {
      const m = p?.value?.match(/#[0-9a-fA-F]{6}/);
      if (m) hexes.push(m[0].toUpperCase());
    }
  }
  return hexes.length ? hexes : ["#111111", "#F5F1E8"];
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
export async function generateLogoCandidates(
  projectId: string,
  variationsOf?: string
): Promise<StudioGenerateResult> {
  const runId = nextLogoRunId++;
  logoRunIds.set(projectId, runId);
  try {
    return await generateLogoCandidatesInner(projectId, variationsOf, runId);
  } finally {
    if (logoRunIds.get(projectId) === runId) logoRunIds.delete(projectId);
    cancelledLogoRunIds.delete(runId);
  }
}

async function generateLogoCandidatesInner(
  projectId: string,
  variationsOf: string | undefined,
  runId: number
): Promise<StudioGenerateResult> {
  const blocked = studioBlockedReason(projectId, "logo");
  if (blocked) throw new Error(blocked);

  if (!hasOpenDesignKey()) {
    throw new Error(
      "No Anthropic key for Open Design BYOK — save it in Settings. Logos run through the OD daemon only."
    );
  }

  const name = clearedName(projectId)!;
  const { context, reads } = strategyContext(projectId);
  const hexes = strategyHexes(projectId);
  // Open Design lane model only (never strategy Settings model).
  const model = MODELS.design;

  const system = `You are a senior brand designer executing a strategy that is already decided.
Never invent strategy — every choice must trace to the brief you are given.
Respond with ONLY one JSON object, no prose or code fences.

THE STRATEGY:
${context}`;

  const base = variationsOf ? getStudioAsset(variationsOf) : undefined;
  if (variationsOf && (!base || base.project_id !== projectId)) throw new Error("Unknown asset");

  const task = base
    ? `The owner chose this direction and wants EXACTLY 3 refined variations of it — same idea, meaningfully
different executions (weight, spacing, mark treatment, lockup):
${JSON.stringify({ label: base.label, direction: base.direction, svg: base.payload?.svg })}`
    : `Design EXACTLY 3 wordmark candidates for the name "${name}". The three must explore genuinely
different directions, not variations of one idea. Return three complete candidates — no fewer.`;

  const user = `${task}

Constraints for every candidate:
- A complete inline SVG (viewBox, no width/height attributes, no external refs, no <image>, no filters).
- Type-driven or geometric only. Lettering uses <text> with font-family set to a Google Fonts family
  that honors the typography direction in the strategy; list every family you used in "fonts".
- Use ONLY these palette hexes: ${JSON.stringify(hexes)}.
- Any mark/isotype is simple geometry (<path>/<rect>/<circle>).
- "svgOnDark" is the same mark recolored for the dark ground.

Return EXACTLY 3 candidates:
{"candidates":[{"label","direction","svg","svgOnDark","fonts":["Family",...]}, ...]}`;

  // Prefer a full set of 3 usable marks; one retry if the model under-delivers.
  let candidates: GeneratedMark[] = [];
  let genText = "";
  for (let attempt = 0; attempt < 2 && candidates.length < 3; attempt++) {
    throwIfLogoCancelled(runId);
    const retryNote =
      attempt === 0
        ? ""
        : `\n\nRETRY: The previous response had ${candidates.length} usable candidate(s). Return EXACTLY 3 complete candidates this time.`;
    const result = await generateDesignText({
      model,
      maxTokens: 9000,
      system,
      messages: [{ role: "user", content: user + retryNote }],
    });
    throwIfLogoCancelled(runId);
    genText = result.text;
    const parsed = extractJson(genText) as { candidates?: GeneratedMark[] };
    candidates = (parsed.candidates ?? []).filter((c) => c?.label && c?.svg).slice(0, 3);
  }
  throwIfLogoCancelled(runId);
  if (candidates.length === 0) throw new Error("Generation returned no usable candidates — try again.");
  if (candidates.length < 3) {
    console.warn(`[studio] logo generation returned ${candidates.length}/3 candidates after retry`);
  }

  // Provenance, same ledger as strategy drafts.
  db.insert(ai_generations)
    .values({
      id: nanoid(),
      project_id: projectId,
      section_key: "studio.logo",
      model,
      reads,
      output: genText.slice(0, 20000),
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
Candidates:
${JSON.stringify(candidates.map((c) => ({ label: c.label, direction: c.direction, svg: c.svg })))}
Return: {"scores":[{"label","criteria":[{"criterion","result","note"}],"verdict","summary"}]}`;

  const { text: judgeText } = await generateDesignText({
    model,
    maxTokens: 4096,
    system: judgeSystem,
    messages: [{ role: "user", content: judgeUser }],
  });
  throwIfLogoCancelled(runId);
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
        tokens: { fonts: (c.fonts ?? []).slice(0, 4) },
      },
      evaluationId: evaluation.id,
      status: "candidate",
      model,
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

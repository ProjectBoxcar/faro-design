import "server-only";
import { db } from "@/lib/db";
import { assets, design_jobs } from "@/lib/db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { nanoid } from "nanoid";
// Design Studio only — Open Design + Anthropic BYOK; never OpenAI/Gemini. See docs/11-ai-lanes.md
import { generateDesignText, hasOpenDesignKey } from "@/lib/ai";
import { getSectionRow, getProject } from "@/lib/queries";
import {
  designSystemPrompt,
  landingPagePrompt,
  brandDeckPrompt,
  channelTemplatePrompt,
  type ChannelPromptKind,
} from "@/lib/design-prompts";
import { CHANNEL_ASSET_KINDS, type ChannelAssetKind } from "@/lib/db/types";
import { designSystemBlockedReason, artifactBlockedReason } from "@/lib/design-gates";
import { isNearDuplicateProposal, proposalSimilarity } from "@/lib/design-similarity";
import { generatedArtifactIssues, normalizeGeneratedHtml } from "@/lib/design-validation";
import { getApprovedLogo } from "@/lib/studio";
import type { BriefContext } from "@/lib/design-gates";
import type { AssetKind } from "@/lib/db/types";

export type { BriefContext } from "@/lib/design-gates";
export type AssetRow = typeof assets.$inferSelect;

function firstField(value: Record<string, unknown> | null | undefined, key: string): string | undefined {
  if (!value) return undefined;
  const v = value[key];
  if (typeof v === "string") return v.trim() || undefined;
  return undefined;
}

// Build a readable brief context from the methodology sections that downstream
// design generation needs. Missing sections are undefined so prompts can gate.
export function buildBriefContext(projectId: string): BriefContext {
  const project = getProject(projectId);
  if (!project) throw new Error("Project not found");

  const r = {
    problem: getSectionRow(projectId, "reality.problem")?.value,
    solution: getSectionRow(projectId, "reality.solution")?.value,
    valueProposition: getSectionRow(projectId, "reality.value-proposition")?.value,
    differentiator: getSectionRow(projectId, "reality.differentiator")?.value,
    idealClient: getSectionRow(projectId, "reality.ideal-client")?.value,
    businessStage: getSectionRow(projectId, "reality.business-stage")?.value,
  };

  const i = {
    origin: getSectionRow(projectId, "identity.origin")?.value,
    aspiration: getSectionRow(projectId, "identity.aspiration")?.value,
    beliefs: getSectionRow(projectId, "identity.beliefs")?.value,
    position: getSectionRow(projectId, "identity.position")?.value,
  };

  // The Strategic Brief lives as one section per finding.
  const brief = {
    centralPattern: getSectionRow(projectId, "brief.central-pattern")?.value,
    mainTension: getSectionRow(projectId, "brief.main-tension")?.value,
    constraint: getSectionRow(projectId, "brief.constraint")?.value,
    emotionalTerritory: getSectionRow(projectId, "brief.emotional-territory")?.value,
    mustResolve: getSectionRow(projectId, "brief.must-resolve")?.value,
  };
  const concept = getSectionRow(projectId, "concept")?.value;

  const c = {
    purpose: getSectionRow(projectId, "communication.purpose")?.value,
    values: getSectionRow(projectId, "communication.values")?.value,
    personality: getSectionRow(projectId, "communication.personality")?.value,
    tone: getSectionRow(projectId, "communication.tone")?.value,
    promise: getSectionRow(projectId, "communication.promise")?.value,
  };

  const manifesto = getSectionRow(projectId, "manifesto")?.value;
  const designPlan = getSectionRow(projectId, "design-plan")?.value;
  const taste = getSectionRow(projectId, "intake.taste")?.value;

  // Strategic Document is a set of sections; concatenate them for a full narrative.
  const docParts = [
    getSectionRow(projectId, "strategic-document.reality")?.value,
    getSectionRow(projectId, "strategic-document.identity")?.value,
    getSectionRow(projectId, "strategic-document.communication")?.value,
    getSectionRow(projectId, "strategic-document.direction")?.value,
  ]
    .filter(Boolean)
    .map((v) => JSON.stringify(v))
    .join("\n\n");

  return {
    project,
    name: project.name,
    client: project.client_name,
    problem: firstField(r.problem, "statement"),
    solution: firstField(r.solution, "statement"),
    valueProposition: firstField(r.valueProposition, "statement"),
    differentiator: firstField(r.differentiator, "statement"),
    idealClient: firstField(r.idealClient, "profile"),
    businessStage: firstField(r.businessStage, "stage"),
    origin: firstField(i.origin, "story"),
    aspiration: firstField(i.aspiration, "statement"),
    beliefs: firstField(i.beliefs, "beliefs"),
    position: firstField(i.position, "statement"),
    centralPattern: firstField(brief.centralPattern, "pattern"),
    mainTension: firstField(brief.mainTension, "tension"),
    constraint: firstField(brief.constraint, "constraint"),
    emotionalTerritory: firstField(brief.emotionalTerritory, "territory"),
    mustResolve: firstField(brief.mustResolve, "question"),
    conceptStatement: firstField(concept, "statement"),
    conceptDescription: firstField(concept, "description"),
    conceptDistillation: firstField(concept, "distillation"),
    purpose: firstField(c.purpose, "statement"),
    values: firstField(c.values, "values"),
    personality: firstField(c.personality, "traits"),
    tone: firstField(c.tone, "traits"),
    promise: firstField(c.promise, "statement"),
    manifesto: firstField(manifesto, "text"),
    strategicDocument: docParts || undefined,
    designPlan: designPlan ? JSON.stringify(designPlan, null, 2) : undefined,
    designTaste: firstField(taste, "taste"),
  };
}

function stringifyContext(ctx: BriefContext): string {
  const lines: string[] = [];
  const add = (label: string, value?: string) => {
    if (value) lines.push(`## ${label}\n${value}`);
  };
  add("Project", ctx.name);
  add("Client", ctx.client ?? undefined);
  add("Value Proposition", ctx.valueProposition);
  add("Differentiator", ctx.differentiator);
  add("Ideal Client", ctx.idealClient);
  add("Business Stage", ctx.businessStage);
  add("Origin", ctx.origin);
  add("Aspiration", ctx.aspiration);
  add("Beliefs", ctx.beliefs);
  add("Position", ctx.position);
  add("Central Pattern", ctx.centralPattern);
  add("Main Tension", ctx.mainTension);
  add("Constraint", ctx.constraint);
  add("Emotional Territory", ctx.emotionalTerritory);
  add("What the Concept Must Resolve", ctx.mustResolve);
  add("Brand Concept", ctx.conceptStatement);
  add("Concept Description", ctx.conceptDescription);
  add("Concept Distillation", ctx.conceptDistillation);
  add("Purpose", ctx.purpose);
  add("Values", ctx.values);
  add("Personality", ctx.personality);
  add("Tone", ctx.tone);
  add("Promise", ctx.promise);
  add("Manifesto", ctx.manifesto);
  if (ctx.strategicDocument) add("Strategic Document", ctx.strategicDocument);
  if (ctx.designPlan) add("Design Plan", ctx.designPlan);
  add("Owner's Design Taste (styles they admire, feelings wanted, things to avoid)", ctx.designTaste);
  return lines.join("\n\n");
}

async function callAi(
  prompt: string,
  maxTokens = 16_000,
  projectId?: string
): Promise<string> {
  // Design Studio ONLY — Open Design daemon. Never OpenAI/Gemini/logo path.
  let memory = "";
  if (projectId) {
    try {
      const { formatMemoryForPrompt } = await import("@/lib/brand-memory");
      memory = formatMemoryForPrompt("design", { excludeProjectId: projectId, limit: 5 });
    } catch {
      /* optional */
    }
  }
  const system = [
    "You are a senior brand designer (Open Design pipeline) translating a finished Finisterra strategy brief into real design artifacts. The strategy brief is the sole source of brand meaning — never invent claims, features, audiences, or stories not present there. Be concrete and decisive. Avoid generic AI-speak and placeholder copy. Output must be a single HTML file starting with <!DOCTYPE html>. Keep markup tight — no filler sections.",
    memory,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { text } = await generateDesignText({
    maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  return text;
}

export { hasOpenDesignKey };

function variantLabel(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C...
}

export type DesignRefineOptions = {
  feedback?: string;
  baseHtml?: string;
};

async function generateSingleAsset(
  projectId: string,
  kind: AssetKind,
  variant: string,
  brief: string,
  projectName: string,
  designSystemHtml?: string,
  designSystemId?: string,
  priorHtml: string[] = [],
  approvedLogoSvg?: string,
  refine?: DesignRefineOptions | null
): Promise<AssetRow> {
  let prompt: string;
  let name: string;

  if (kind === "design_system") {
    if (!approvedLogoSvg) {
      throw new Error("Approve a logo in the Logo Workshop before generating identity systems.");
    }
    prompt = designSystemPrompt(variant, brief, approvedLogoSvg, refine);
    name = `${projectName} — Identity System ${variant}`;
  } else if (kind === "landing_page") {
    prompt = landingPagePrompt(variant, brief, designSystemHtml ?? "");
    name = `${projectName} — Landing Page ${variant}`;
  } else if (kind === "deck") {
    prompt = brandDeckPrompt(variant, brief, designSystemHtml ?? "");
    name = `${projectName} — Brand Deck ${variant}`;
  } else if (
    kind === "sms" ||
    kind === "email" ||
    kind === "ad" ||
    kind === "print"
  ) {
    prompt = channelTemplatePrompt(kind as ChannelPromptKind, brief, designSystemHtml ?? "");
    const labels: Record<ChannelAssetKind, string> = {
      sms: "SMS template",
      email: "Email template",
      ad: "Ad mockups",
      print: "Print collateral",
    };
    name = `${projectName} — ${labels[kind]}`;
  } else {
    throw new Error(`Unsupported design asset kind: ${kind}`);
  }

  // Identity systems need headroom for full HTML; channels a bit less than decks.
  const maxTokens =
    kind === "design_system" ? 24_000 : kind === "sms" || kind === "ad" ? 10_000 : 16_000;

  let html = "";
  let lastIssues: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const issueHint =
      lastIssues.length > 0
        ? `\n\nPREVIOUS ATTEMPT FAILED VALIDATION:\n- ${lastIssues.join("\n- ")}\nFix every issue listed. No markdown fences. No external URLs/fonts/CDNs.`
        : "";
    const retryDirection =
      attempt === 0
        ? ""
        : `\n\nRETRY REQUIRED: Rebuild as one complete offline HTML document starting with <!DOCTYPE html> and ending with </html>. Follow every required hook and offline constraint exactly. Preserve this proposal's strategy and creative thesis.${issueHint}`;
    const raw = await callAi(prompt + retryDirection, maxTokens, projectId);
    if (!raw?.trim()) {
      lastIssues = ["empty model response"];
      console.warn(`[design] Proposal ${kind}/${variant} empty response (attempt ${attempt + 1})`);
      continue;
    }
    // Normalize markdown wrappers, incomplete docs, external assets, missing shells.
    html = normalizeGeneratedHtml(raw, kind, { approvedLogoSvg });
    const closest = priorHtml.reduce(
      (highest, existing) => Math.max(highest, proposalSimilarity(html, existing)),
      0
    );
    const duplicate = priorHtml.some((existing) => isNearDuplicateProposal(html, existing));
    const validationIssues = generatedArtifactIssues(kind, html);
    lastIssues = [
      ...(duplicate ? [`similarity ${closest.toFixed(3)}`] : []),
      ...validationIssues,
    ];
    if (!duplicate && validationIssues.length === 0) break;
    console.warn(
      `[design] Proposal ${kind}/${variant} rejected (attempt ${attempt + 1}): ${lastIssues.join("; ")}`
    );
    // Last attempt may keep a real HTML document that still has smaller issues.
    // Anything that is not an HTML document is discarded, including the last try.
    const isHtmlDoc = /<!doctype html>/i.test(html) && /<\/html>/i.test(html);
    if (attempt === 2 && !duplicate && isHtmlDoc && html.length > 1500) {
      console.warn(
        `[design] Proposal ${kind}/${variant} accepted with remaining issues: ${lastIssues.join("; ")}`
      );
      break;
    }
    html = "";
  }
  if (!html?.trim()) {
    throw new Error(
      `Faro could not create a distinct proposal ${variant}. ${lastIssues.join("; ") || "Generate the set again."}`
    );
  }

  const id = nanoid();
  db.insert(assets)
    .values({
      id,
      project_id: projectId,
      kind,
      variant,
      selected: false,
      design_system_id: kind !== "design_system" ? designSystemId : undefined,
      name: name.replace("## ", ""),
      html,
      prompt,
      status: "draft",
      ai_generated: true,
    })
    .run();
  return db.select().from(assets).where(eq(assets.id, id)).get()!;
}

function removeAssetRows(projectId: string, assetIds: string[]): void {
  for (const assetId of assetIds) {
    db.delete(assets)
      .where(and(eq(assets.project_id, projectId), eq(assets.id, assetId)))
      .run();
  }
}

async function generateProposalSet({
  projectId,
  kind,
  count,
  brief,
  projectName,
  designSystemHtml,
  designSystemId,
  approvedLogoSvg,
  onAsset,
  refine,
}: {
  projectId: string;
  kind: "design_system" | "landing_page" | "deck" | ChannelAssetKind;
  count: number;
  brief: string;
  projectName: string;
  designSystemHtml?: string;
  designSystemId?: string;
  approvedLogoSvg?: string;
  onAsset?: (asset: AssetRow) => void;
  refine?: DesignRefineOptions | null;
}): Promise<AssetRow[]> {
  const existing = listProposals(projectId, kind);
  // When refining a liked proposal, keep all existing (including base) so the owner can compare.
  const previousIds = refine
    ? []
    : existing.filter((asset) => !asset.selected).map((asset) => asset.id);
  const protectedHtml = existing.flatMap((asset) =>
    asset.selected && asset.html ? [asset.html] : []
  );
  if (refine?.baseHtml) protectedHtml.push(refine.baseHtml);
  const results: AssetRow[] = [];
  try {
    // Sequential on purpose: each proposal sees prior HTML so directions stay
    // distinct and strategy-grounded (parallel batches tended to clone).
    for (let index = 0; index < count; index++) {
      const variant = refine ? `R${index + 1}` : variantLabel(index);
      const priorHtml = [
        ...protectedHtml,
        ...results.flatMap((asset) => (asset.html ? [asset.html] : [])),
      ];
      const asset = await generateSingleAsset(
        projectId,
        kind,
        variant,
        brief,
        projectName,
        designSystemHtml,
        designSystemId,
        priorHtml,
        approvedLogoSvg,
        refine
      );
      results.push(asset);
      onAsset?.(asset);
    }
    if (previousIds.length > 0) removeAssetRows(projectId, previousIds);
    return results;
  } catch (error) {
    removeAssetRows(
      projectId,
      results.map((asset) => asset.id)
    );
    throw error;
  }
}

export async function generateDesignSystemProposals(
  projectId: string,
  count = 3,
  onAsset?: (asset: AssetRow) => void,
  refine?: DesignRefineOptions | null
): Promise<AssetRow[]> {
  const ctx = buildBriefContext(projectId);
  const approvedLogo = getApprovedLogo(projectId);
  const logoSvg = approvedLogo?.payload?.svg;
  const blocked = designSystemBlockedReason(ctx, { hasApprovedLogo: Boolean(logoSvg) });
  if (blocked) throw new Error(blocked);
  if (!logoSvg) throw new Error("Approve a logo in the Logo Workshop first.");

  const brief = stringifyContext(ctx);
  return generateProposalSet({
    projectId,
    kind: "design_system",
    count,
    brief,
    projectName: ctx.name,
    approvedLogoSvg: logoSvg,
    onAsset,
    refine,
  });
}


export async function generateLandingPageProposals(
  projectId: string,
  designSystemId: string,
  count = 3,
  onAsset?: (asset: AssetRow) => void
): Promise<AssetRow[]> {
  const ctx = buildBriefContext(projectId);
  const designSystem = getAsset(projectId, designSystemId);
  const blocked = artifactBlockedReason(
    Boolean(designSystem?.kind === "design_system" && designSystem.selected),
    "landing_page"
  );
  if (blocked || !designSystem) throw new Error(blocked ?? "Selected design system not found");

  const brief = stringifyContext(ctx);
  return generateProposalSet({
    projectId,
    kind: "landing_page",
    count,
    brief,
    projectName: ctx.name,
    designSystemHtml: designSystem.html ?? "",
    designSystemId: designSystem.id,
    onAsset,
  });
}

export async function generateBrandDeckProposals(
  projectId: string,
  designSystemId: string,
  count = 3,
  onAsset?: (asset: AssetRow) => void
): Promise<AssetRow[]> {
  const ctx = buildBriefContext(projectId);
  const designSystem = getAsset(projectId, designSystemId);
  const blocked = artifactBlockedReason(
    Boolean(designSystem?.kind === "design_system" && designSystem.selected),
    "deck"
  );
  if (blocked || !designSystem) throw new Error(blocked ?? "Selected design system not found");

  const brief = stringifyContext(ctx);
  return generateProposalSet({
    projectId,
    kind: "deck",
    count,
    brief,
    projectName: ctx.name,
    designSystemHtml: designSystem.html ?? "",
    designSystemId: designSystem.id,
    onAsset,
  });
}

// The application mockups that follow an approved identity system, per the
// design plan's execution order: identity first, then the landing page and
// brand deck as applications of it. One of each, auto-selected — they
// demonstrate the approved system rather than compete for a separate choice.
export async function generateApplicationMockups(
  projectId: string,
  designSystemId: string,
  onAsset?: (asset: AssetRow) => void
): Promise<AssetRow[]> {
  const results: AssetRow[] = [];
  const [landing] = await generateLandingPageProposals(projectId, designSystemId, 1, onAsset);
  selectAsset(projectId, landing.id);
  results.push(getAsset(projectId, landing.id)!);
  const [deck] = await generateBrandDeckProposals(projectId, designSystemId, 1, onAsset);
  selectAsset(projectId, deck.id);
  results.push(getAsset(projectId, deck.id)!);
  return results;
}

export async function generateChannelTemplate(
  projectId: string,
  designSystemId: string,
  kind: ChannelAssetKind,
  onAsset?: (asset: AssetRow) => void
): Promise<AssetRow> {
  const ctx = buildBriefContext(projectId);
  const designSystem = getAsset(projectId, designSystemId);
  const blocked = artifactBlockedReason(
    Boolean(designSystem?.kind === "design_system" && designSystem.selected),
    kind
  );
  if (blocked || !designSystem) throw new Error(blocked ?? "Selected design system not found");

  const brief = stringifyContext(ctx);
  const [asset] = await generateProposalSet({
    projectId,
    kind,
    count: 1,
    brief,
    projectName: ctx.name,
    designSystemHtml: designSystem.html ?? "",
    designSystemId: designSystem.id,
    onAsset,
  });
  selectAsset(projectId, asset.id);
  return getAsset(projectId, asset.id)!;
}

/** SMS + email + ad + print — one each, auto-selected, following the identity. */
export async function generateChannelMockups(
  projectId: string,
  designSystemId: string,
  onAsset?: (asset: AssetRow) => void
): Promise<AssetRow[]> {
  const results: AssetRow[] = [];
  for (const kind of CHANNEL_ASSET_KINDS) {
    const asset = await generateChannelTemplate(projectId, designSystemId, kind, onAsset);
    results.push(asset);
  }
  return results;
}

// Keep single-generation helpers for callers that expect one asset; they create a single variant "A".
export async function generateDesignSystem(projectId: string): Promise<AssetRow> {
  const proposals = await generateDesignSystemProposals(projectId, 1);
  return proposals[0];
}

export async function generateLandingPage(projectId: string): Promise<AssetRow> {
  const designSystem = getSelectedAsset(projectId, "design_system");
  if (!designSystem) throw new Error("No design system selected");
  const proposals = await generateLandingPageProposals(projectId, designSystem.id, 1);
  return proposals[0];
}

export async function generateBrandDeck(projectId: string): Promise<AssetRow> {
  const designSystem = getSelectedAsset(projectId, "design_system");
  if (!designSystem) throw new Error("No design system selected");
  const proposals = await generateBrandDeckProposals(projectId, designSystem.id, 1);
  return proposals[0];
}

export function listAssets(projectId: string, kind?: AssetKind): AssetRow[] {
  if (kind) {
    return db
      .select()
      .from(assets)
      .where(and(eq(assets.project_id, projectId), eq(assets.kind, kind)))
      .orderBy(desc(assets.created_at))
      .all();
  }
  return db
    .select()
    .from(assets)
    .where(eq(assets.project_id, projectId))
    .orderBy(desc(assets.created_at))
    .all();
}

export function listProposals(projectId: string, kind: AssetKind): AssetRow[] {
  return db
    .select()
    .from(assets)
    .where(and(eq(assets.project_id, projectId), eq(assets.kind, kind)))
    .orderBy(assets.variant)
    .all();
}

export function getAsset(projectId: string, assetId: string): AssetRow | undefined {
  return db.select().from(assets).where(and(eq(assets.project_id, projectId), eq(assets.id, assetId))).get();
}

export function getAssetByKind(projectId: string, kind: AssetKind): AssetRow | undefined {
  // Prefer the selected asset; fall back to the most recent.
  const selected = db
    .select()
    .from(assets)
    .where(and(eq(assets.project_id, projectId), eq(assets.kind, kind), eq(assets.selected, true)))
    .get();
  if (selected) return selected;
  return db
    .select()
    .from(assets)
    .where(and(eq(assets.project_id, projectId), eq(assets.kind, kind)))
    .orderBy(desc(assets.created_at))
    .get();
}

export function getSelectedAsset(projectId: string, kind: AssetKind): AssetRow | undefined {
  return db
    .select()
    .from(assets)
    .where(and(eq(assets.project_id, projectId), eq(assets.kind, kind), eq(assets.selected, true)))
    .get();
}

export function selectAsset(projectId: string, assetId: string): AssetRow {
  const asset = getAsset(projectId, assetId);
  if (!asset) throw new Error("Asset not found");
  // Learning capture runs after select completes (see end of function).
  const previousSelected = getSelectedAsset(projectId, asset.kind);

  db.update(assets)
    .set({ selected: false })
    .where(and(eq(assets.project_id, projectId), eq(assets.kind, asset.kind)))
    .run();

  if (asset.kind === "design_system" && previousSelected?.id !== asset.id) {
    // Deselect applications tied to the previous identity (core + channel templates).
    db.update(assets)
      .set({ selected: false, updated_at: new Date() })
      .where(
        and(
          eq(assets.project_id, projectId),
          or(
            eq(assets.kind, "landing_page"),
            eq(assets.kind, "deck"),
            eq(assets.kind, "sms"),
            eq(assets.kind, "email"),
            eq(assets.kind, "ad"),
            eq(assets.kind, "print")
          )
        )
      )
      .run();
  }

  db.update(assets)
    .set({ selected: true, updated_at: new Date() })
    .where(and(eq(assets.project_id, projectId), eq(assets.id, assetId)))
    .run();

  const selected = db.select().from(assets).where(eq(assets.id, assetId)).get()!;
  if (
    selected.kind === "design_system" ||
    selected.kind === "landing_page" ||
    selected.kind === "deck"
  ) {
    void import("@/lib/brand-memory")
      .then(({ recordDesignLearning }) =>
        recordDesignLearning(projectId, assetId, selected.kind as "design_system" | "landing_page" | "deck")
      )
      .catch((e) => console.warn("[brand-memory] design learn failed:", e));
  }
  return selected;
}

export function updateAssetStatus(assetId: string, status: AssetRow["status"]): void {
  db.update(assets).set({ status, updated_at: new Date() }).where(eq(assets.id, assetId)).run();
}

export function deleteAsset(projectId: string, assetId: string): void {
  const asset = getAsset(projectId, assetId);
  if (asset?.kind === "design_system") {
    db.update(assets)
      .set({ selected: false, updated_at: new Date() })
      .where(and(eq(assets.project_id, projectId), eq(assets.design_system_id, assetId)))
      .run();
  }
  db.delete(assets)
    .where(and(eq(assets.project_id, projectId), eq(assets.id, assetId)))
    .run();
  // Keep design job ledgers in sync so a deleted proposal is not still listed.
  const jobs = db.select().from(design_jobs).where(eq(design_jobs.project_id, projectId)).all();
  for (const row of jobs) {
    const ids = row.asset_ids ?? [];
    if (!ids.includes(assetId)) continue;
    db.update(design_jobs)
      .set({
        asset_ids: ids.filter((id) => id !== assetId),
        updated_at: new Date(),
      })
      .where(and(eq(design_jobs.id, row.id), eq(design_jobs.project_id, projectId)))
      .run();
  }
}

export function deleteProposals(projectId: string, kind: AssetKind, keepSelected = true): void {
  const idsToDelete = listProposals(projectId, kind)
    .filter((a) => !keepSelected || !a.selected)
    .map((a) => a.id);
  for (const id of idsToDelete) {
    deleteAsset(projectId, id);
  }
}

import "server-only";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateText } from "@/lib/ai";
import { getSectionRow, getProject } from "@/lib/queries";
import { designSystemPrompt, landingPagePrompt, brandDeckPrompt } from "@/lib/design-prompts";
import { designSystemBlockedReason, artifactBlockedReason } from "@/lib/design-gates";
import { isNearDuplicateProposal, proposalSimilarity } from "@/lib/design-similarity";
import { generatedArtifactIssues } from "@/lib/design-validation";
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

  const brief = getSectionRow(projectId, "brief")?.value;
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
    centralPattern: firstField(brief, "central-pattern"),
    mainTension: firstField(brief, "main-tension"),
    constraint: firstField(brief, "constraint"),
    emotionalTerritory: firstField(brief, "emotional-territory"),
    mustResolve: firstField(brief, "must-resolve"),
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
  return lines.join("\n\n");
}

async function callAi(prompt: string): Promise<string> {
  const { text } = await generateText({
    maxTokens: 32000,
    system:
      "You are a senior brand designer translating a Finisterra brand strategy into real, usable design artifacts. Be concrete, specific, and decisive. Avoid generic AI-speak and placeholder copy. Output must be a single HTML file starting with <!DOCTYPE html>.",
    messages: [{ role: "user", content: prompt }],
  });
  return text;
}

function variantLabel(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C...
}

async function generateSingleAsset(
  projectId: string,
  kind: AssetKind,
  variant: string,
  brief: string,
  projectName: string,
  designSystemHtml?: string,
  designSystemId?: string,
  priorHtml: string[] = []
): Promise<AssetRow> {
  let prompt: string;
  let name: string;

  if (kind === "design_system") {
    prompt = designSystemPrompt(variant, brief);
    name = `${projectName} — Identity System ${variant}`;
  } else if (kind === "landing_page") {
    prompt = landingPagePrompt(variant, brief, designSystemHtml ?? "");
    name = `${projectName} — Landing Page ${variant}`;
  } else {
    prompt = brandDeckPrompt(variant, brief, designSystemHtml ?? "");
    name = `${projectName} — Brand Deck ${variant}`;
  }

  let html = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const retryDirection = attempt === 0
      ? ""
      : "\n\nRETRY REQUIRED: The previous result failed the distinctness or technical delivery contract. Rebuild from a blank composition, follow every required hook and offline constraint exactly, and preserve this proposal's strategy and creative thesis.";
    html = await callAi(prompt + retryDirection);
    const closest = priorHtml.reduce(
      (highest, existing) => Math.max(highest, proposalSimilarity(html, existing)),
      0
    );
    const duplicate = priorHtml.some((existing) => isNearDuplicateProposal(html, existing));
    const validationIssues = generatedArtifactIssues(kind, html);
    if (!duplicate && validationIssues.length === 0) break;
    console.warn(
      `[design] Proposal ${kind}/${variant} rejected: ${[
        duplicate ? `similarity ${closest.toFixed(3)}` : "",
        ...validationIssues,
      ].filter(Boolean).join("; ")}`
    );
    html = "";
  }
  if (!html) {
    throw new Error(`Faro could not create a distinct proposal ${variant}. Generate the set again.`);
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
  onAsset,
}: {
  projectId: string;
  kind: "design_system" | "landing_page" | "deck";
  count: number;
  brief: string;
  projectName: string;
  designSystemHtml?: string;
  designSystemId?: string;
  onAsset?: (asset: AssetRow) => void;
}): Promise<AssetRow[]> {
  const existing = listProposals(projectId, kind);
  const previousIds = existing.filter((asset) => !asset.selected).map((asset) => asset.id);
  const protectedHtml = existing.flatMap((asset) => asset.selected && asset.html ? [asset.html] : []);
  const results: AssetRow[] = [];
  try {
    for (let index = 0; index < count; index++) {
      const variant = variantLabel(index);
      const priorHtml = [
        ...protectedHtml,
        ...results.flatMap((asset) => asset.html ? [asset.html] : []),
      ];
      const asset = await generateSingleAsset(
        projectId,
        kind,
        variant,
        brief,
        projectName,
        designSystemHtml,
        designSystemId,
        priorHtml
      );
      results.push(asset);
      onAsset?.(asset);
    }
    removeAssetRows(projectId, previousIds);
    return results;
  } catch (error) {
    removeAssetRows(projectId, results.map((asset) => asset.id));
    throw error;
  }
}

export async function generateDesignSystemProposals(
  projectId: string,
  count = 3,
  onAsset?: (asset: AssetRow) => void
): Promise<AssetRow[]> {
  const ctx = buildBriefContext(projectId);
  const blocked = designSystemBlockedReason(ctx);
  if (blocked) throw new Error(blocked);

  const brief = stringifyContext(ctx);
  return generateProposalSet({
    projectId,
    kind: "design_system",
    count,
    brief,
    projectName: ctx.name,
    onAsset,
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
  const previousSelected = getSelectedAsset(projectId, asset.kind);

  db.update(assets)
    .set({ selected: false })
    .where(and(eq(assets.project_id, projectId), eq(assets.kind, asset.kind)))
    .run();

  if (asset.kind === "design_system" && previousSelected?.id !== asset.id) {
    db.update(assets)
      .set({ selected: false, updated_at: new Date() })
      .where(
        and(
          eq(assets.project_id, projectId),
          or(eq(assets.kind, "landing_page"), eq(assets.kind, "deck"))
        )
      )
      .run();
  }

  db.update(assets)
    .set({ selected: true, updated_at: new Date() })
    .where(and(eq(assets.project_id, projectId), eq(assets.id, assetId)))
    .run();

  return db.select().from(assets).where(eq(assets.id, assetId)).get()!;
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
}

export function deleteProposals(projectId: string, kind: AssetKind, keepSelected = true): void {
  const idsToDelete = listProposals(projectId, kind)
    .filter((a) => !keepSelected || !a.selected)
    .map((a) => a.id);
  for (const id of idsToDelete) {
    db.delete(assets).where(and(eq(assets.project_id, projectId), eq(assets.id, id))).run();
  }
}

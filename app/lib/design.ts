import "server-only";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateText } from "@/lib/ai";
import { getSectionRow, getProject } from "@/lib/queries";
import { designSystemPrompt, landingPagePrompt, brandDeckPrompt } from "@/lib/design-prompts";
import { designSystemBlockedReason, artifactBlockedReason } from "@/lib/design-gates";
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
    getSectionRow(projectId, "strategic-document.image")?.value,
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

function variantMood(label: string): string {
  // Give each proposal a distinct creative direction so the user sees real options.
  switch (label) {
    case "A":
      return "premium, restrained, editorial, confident; generous whitespace, refined typography, calm authority";
    case "B":
      return "warm, human, approachable, tactile; rounded forms, friendly color, organic rhythm";
    case "C":
      return "bold, high-contrast, contemporary, category-challenging; sharp forms, confident scale, editorial drama";
    default:
      return "premium and contemporary";
  }
}

async function generateSingleAsset(
  projectId: string,
  kind: AssetKind,
  variant: string,
  brief: string,
  projectName: string,
  designSystemHtml?: string,
  designSystemId?: string
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

  const html = await callAi(prompt + `\n\nAdditional direction for proposal ${variant}: ${variantMood(variant)}.`);

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

export async function generateDesignSystemProposals(projectId: string, count = 3): Promise<AssetRow[]> {
  const ctx = buildBriefContext(projectId);
  const blocked = designSystemBlockedReason(ctx);
  if (blocked) throw new Error(blocked);

  const brief = stringifyContext(ctx);
  deleteProposals(projectId, "design_system", false);
  const results: AssetRow[] = [];
  for (let i = 0; i < count; i++) {
    const variant = variantLabel(i);
    results.push(await generateSingleAsset(projectId, "design_system", variant, brief, ctx.name));
  }
  return results;
}


export async function generateLandingPageProposals(
  projectId: string,
  designSystemId: string,
  count = 3
): Promise<AssetRow[]> {
  const ctx = buildBriefContext(projectId);
  const blocked = artifactBlockedReason(true, "landing_page");
  if (blocked) throw new Error(blocked);

  const designSystem = getAsset(projectId, designSystemId);
  if (!designSystem || designSystem.kind !== "design_system") {
    throw new Error("Selected design system not found");
  }

  const brief = stringifyContext(ctx);
  deleteProposals(projectId, "landing_page", false);
  const results: AssetRow[] = [];
  for (let i = 0; i < count; i++) {
    const variant = variantLabel(i);
    results.push(await generateSingleAsset(projectId, "landing_page", variant, brief, ctx.name, designSystem.html ?? "", designSystem.id));
  }
  return results;
}

export async function generateBrandDeckProposals(
  projectId: string,
  designSystemId: string,
  count = 3
): Promise<AssetRow[]> {
  const ctx = buildBriefContext(projectId);
  const blocked = artifactBlockedReason(true, "deck");
  if (blocked) throw new Error(blocked);

  const designSystem = getAsset(projectId, designSystemId);
  if (!designSystem || designSystem.kind !== "design_system") {
    throw new Error("Selected design system not found");
  }

  const brief = stringifyContext(ctx);
  deleteProposals(projectId, "deck", false);
  const results: AssetRow[] = [];
  for (let i = 0; i < count; i++) {
    const variant = variantLabel(i);
    results.push(await generateSingleAsset(projectId, "deck", variant, brief, ctx.name, designSystem.html ?? "", designSystem.id));
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

  db.update(assets)
    .set({ selected: false })
    .where(and(eq(assets.project_id, projectId), eq(assets.kind, asset.kind)))
    .run();

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

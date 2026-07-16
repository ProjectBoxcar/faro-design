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
    maxTokens: 8192,
    system:
      "You are a senior brand designer translating a Finisterra brand strategy into real, usable design artifacts. Be concrete, specific, and decisive. Avoid generic AI-speak and placeholder copy.",
    messages: [{ role: "user", content: prompt }],
  });
  return text;
}

export async function generateDesignSystem(projectId: string): Promise<AssetRow> {
  const ctx = buildBriefContext(projectId);
  const blocked = designSystemBlockedReason(ctx);
  if (blocked) throw new Error(blocked);

  const prompt = designSystemPrompt(stringifyContext(ctx));
  const markdown = await callAi(prompt);

  const id = nanoid();
  db.insert(assets)
    .values({
      id,
      project_id: projectId,
      kind: "design_system",
      name: `${ctx.name} — Brand Identity System`,
      html: markdown,
      prompt,
      status: "draft",
      ai_generated: true,
    })
    .run();
  return db.select().from(assets).where(eq(assets.id, id)).get()!;
}

export async function generateLandingPage(projectId: string): Promise<AssetRow> {
  const ctx = buildBriefContext(projectId);
  const blocked = artifactBlockedReason(Boolean(getAssetByKind(projectId, "design_system")), "landing_page");
  if (blocked) throw new Error(blocked);

  const designSystem = getAssetByKind(projectId, "design_system")!;
  const prompt = landingPagePrompt(stringifyContext(ctx), designSystem.html ?? "");
  const html = await callAi(prompt);

  const id = nanoid();
  db.insert(assets)
    .values({
      id,
      project_id: projectId,
      kind: "landing_page",
      name: `${ctx.name} — Landing Page`,
      html,
      prompt,
      status: "draft",
      ai_generated: true,
    })
    .run();
  return db.select().from(assets).where(eq(assets.id, id)).get()!;
}

export async function generateBrandDeck(projectId: string): Promise<AssetRow> {
  const ctx = buildBriefContext(projectId);
  const blocked = artifactBlockedReason(Boolean(getAssetByKind(projectId, "design_system")), "deck");
  if (blocked) throw new Error(blocked);

  const designSystem = getAssetByKind(projectId, "design_system")!;
  const prompt = brandDeckPrompt(stringifyContext(ctx), designSystem.html ?? "");
  const html = await callAi(prompt);

  const id = nanoid();
  db.insert(assets)
    .values({
      id,
      project_id: projectId,
      kind: "deck",
      name: `${ctx.name} — Brand Deck`,
      html,
      prompt,
      status: "draft",
      ai_generated: true,
    })
    .run();
  return db.select().from(assets).where(eq(assets.id, id)).get()!;
}

export function listAssets(projectId: string): AssetRow[] {
  return db.select().from(assets).where(eq(assets.project_id, projectId)).orderBy(desc(assets.created_at)).all();
}

export function getAsset(projectId: string, assetId: string): AssetRow | undefined {
  return db.select().from(assets).where(and(eq(assets.project_id, projectId), eq(assets.id, assetId))).get();
}

export function getAssetByKind(projectId: string, kind: AssetKind): AssetRow | undefined {
  return db
    .select()
    .from(assets)
    .where(and(eq(assets.project_id, projectId), eq(assets.kind, kind)))
    .orderBy(desc(assets.created_at))
    .get();
}

export function updateAssetStatus(assetId: string, status: AssetRow["status"]): void {
  db.update(assets).set({ status, updated_at: new Date() }).where(eq(assets.id, assetId)).run();
}

export function deleteAsset(projectId: string, assetId: string): void {
  db.delete(assets)
    .where(and(eq(assets.project_id, projectId), eq(assets.id, assetId)))
    .run();
}

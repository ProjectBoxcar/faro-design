import "server-only";
import { db } from "@/lib/db";
import { projects, sections, evaluations, ai_generations } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { SectionValue, EvalScore } from "@/lib/db/types";

export type Project = typeof projects.$inferSelect;
export type SectionRow = typeof sections.$inferSelect;
export type EvaluationRow = typeof evaluations.$inferSelect;

export function listProjects(): Project[] {
  return db.select().from(projects).orderBy(desc(projects.updated_at)).all();
}

export function getProject(id: string): Project | undefined {
  return db.select().from(projects).where(eq(projects.id, id)).get();
}

export function getProjectByShareToken(token: string): Project | undefined {
  return db.select().from(projects).where(eq(projects.share_token, token)).get();
}

export function createProject(input: {
  name: string;
  client_name?: string | null;
  greenfield?: boolean;
  personal?: boolean;
}): Project {
  const id = nanoid();
  db.insert(projects)
    .values({
      id,
      name: input.name,
      client_name: input.client_name ?? null,
      greenfield: input.greenfield ?? false,
      personal: input.personal ?? false,
    })
    .run();
  // Greenfield: the methodology skips the Brand Audit (nothing exists to audit)
  // and the Design Plan sources everything as "create". Seed the audit with that
  // conclusion so downstream steps read it and the journey doesn't dead-end.
  if (input.greenfield) {
    saveSection({
      projectId: id,
      key: "audit",
      value: {
        assets: [
          {
            asset: "Everything — greenfield brand",
            currentState: "No existing brand assets",
            evalVsConcept: "Not applicable — nothing to audit",
            action: "create",
          },
        ],
      },
      status: "complete",
    });
  }
  return getProject(id)!;
}

// Delete a project and everything in it (sections/evaluations/ai_generations
// cascade via foreign keys).
export function deleteProject(id: string): void {
  db.delete(projects).where(eq(projects.id, id)).run();
}

// Clear one step's saved answers (removes the row entirely → back to "empty").
export function deleteSection(projectId: string, key: string): void {
  const existing = getSectionRow(projectId, key);
  if (existing) db.delete(sections).where(eq(sections.id, existing.id)).run();
  db.update(projects).set({ updated_at: new Date() }).where(eq(projects.id, projectId)).run();
}

export function getSections(projectId: string): SectionRow[] {
  return db.select().from(sections).where(eq(sections.project_id, projectId)).all();
}

export function getSectionRow(projectId: string, key: string): SectionRow | undefined {
  return db
    .select()
    .from(sections)
    .where(eq(sections.project_id, projectId))
    .all()
    .find((s) => s.section_key === key);
}

// Upsert a section's value + status. Manual edits clear the ai_generated flag.
// A real upsert (not check-then-insert): concurrent saves — e.g. the debounced
// autosave racing the unmount keepalive flush — land as updates instead of
// violating the (project, key) unique index.
export function saveSection(input: {
  projectId: string;
  key: string;
  value: SectionValue;
  status?: SectionRow["status"];
  aiGenerated?: boolean;
}): SectionRow {
  const existing = getSectionRow(input.projectId, input.key);
  const status = input.status ?? (existing?.status === "empty" || !existing ? "draft" : existing.status);
  db.insert(sections)
    .values({
      id: nanoid(),
      project_id: input.projectId,
      section_key: input.key,
      value: input.value,
      status,
      ai_generated: input.aiGenerated ?? false,
    })
    .onConflictDoUpdate({
      target: [sections.project_id, sections.section_key],
      set: {
        value: input.value,
        status,
        ai_generated: input.aiGenerated ?? false,
        updated_at: new Date(),
      },
    })
    .run();
  db.update(projects).set({ updated_at: new Date() }).where(eq(projects.id, input.projectId)).run();
  return getSectionRow(input.projectId, input.key)!;
}

// Record the owner accepting an AI draft ("Use this"), for provenance/compare.
export function markGenerationAccepted(id: string): void {
  db.update(ai_generations).set({ accepted: true }).where(eq(ai_generations.id, id)).run();
}

// Cache the viability gate's verdict on the project row.
export function setProjectViability(id: string, viability: "pass" | "fail"): void {
  db.update(projects).set({ viability, updated_at: new Date() }).where(eq(projects.id, id)).run();
}

// Publish a project: mint an unguessable share token (reuse if one already exists)
// and (re)stamp published_at. Returns the share token for the public handover link.
export function publishProject(id: string): string {
  const existing = getProject(id);
  const token = existing?.share_token ?? nanoid();
  db.update(projects)
    .set({ share_token: token, published_at: new Date(), updated_at: new Date() })
    .where(eq(projects.id, id))
    .run();
  return token;
}

// Unpublish: revoke the share link by clearing the token and published timestamp.
export function unpublishProject(id: string): void {
  db.update(projects)
    .set({ share_token: null, published_at: null, updated_at: new Date() })
    .where(eq(projects.id, id))
    .run();
}

// Mark every section in a reviewed pillar that actually has content as complete.
// Empty steps (e.g. an Image survey the owner skipped) are left alone.
export function completeSectionsWithContent(projectId: string, keys: string[]): void {
  for (const key of keys) {
    const row = getSectionRow(projectId, key);
    if (!row?.value) continue;
    const v = row.value as Record<string, unknown>;
    const hasContent = Object.values(v).some((x) => {
      if (x == null) return false;
      if (typeof x === "string") return x.trim() !== "";
      if (Array.isArray(x)) return x.length > 0;
      return true;
    });
    if (!hasContent) continue;
    db.update(sections).set({ status: "complete", updated_at: new Date() }).where(eq(sections.id, row.id)).run();
  }
  db.update(projects).set({ updated_at: new Date() }).where(eq(projects.id, projectId)).run();
}

// Multi-instance scored frameworks (naming availability checks, logo evals...).
export function insertEvaluation(input: {
  projectId: string;
  type: EvaluationRow["type"];
  subject: string;
  scores: EvalScore[];
  verdict: EvaluationRow["verdict"];
}): EvaluationRow {
  const id = nanoid();
  db.insert(evaluations)
    .values({
      id,
      project_id: input.projectId,
      type: input.type,
      subject: input.subject,
      scores: input.scores,
      verdict: input.verdict,
    })
    .run();
  return db.select().from(evaluations).where(eq(evaluations.id, id)).get()!;
}

export function listEvaluations(projectId: string, type: EvaluationRow["type"]): EvaluationRow[] {
  return db
    .select()
    .from(evaluations)
    .where(and(eq(evaluations.project_id, projectId), eq(evaluations.type, type)))
    .orderBy(desc(evaluations.created_at))
    .all();
}

// Set of section keys that have at least draft content — used for dependency gating.
export function filledKeys(projectId: string): Set<string> {
  return new Set(
    getSections(projectId)
      .filter((s) => s.status !== "empty")
      .map((s) => s.section_key)
  );
}

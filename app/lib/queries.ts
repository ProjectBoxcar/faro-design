import "server-only";
import { db } from "@/lib/db";
import { projects, sections } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { SectionValue } from "@/lib/db/types";

export type Project = typeof projects.$inferSelect;
export type SectionRow = typeof sections.$inferSelect;

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
}): Project {
  const id = nanoid();
  db.insert(projects)
    .values({
      id,
      name: input.name,
      client_name: input.client_name ?? null,
      greenfield: input.greenfield ?? false,
    })
    .run();
  return getProject(id)!;
}

// Completed-step count per project, for progress bars on the dashboard.
export function completedCountByProject(): Map<string, number> {
  const rows = db
    .select({ project_id: sections.project_id, n: count() })
    .from(sections)
    .where(eq(sections.status, "complete"))
    .groupBy(sections.project_id)
    .all();
  return new Map(rows.map((r) => [r.project_id, r.n]));
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
export function saveSection(input: {
  projectId: string;
  key: string;
  value: SectionValue;
  status?: SectionRow["status"];
  aiGenerated?: boolean;
}): SectionRow {
  const existing = getSectionRow(input.projectId, input.key);
  const status = input.status ?? (existing?.status === "empty" || !existing ? "draft" : existing.status);
  if (existing) {
    db.update(sections)
      .set({
        value: input.value,
        status,
        ai_generated: input.aiGenerated ?? false,
        updated_at: new Date(),
      })
      .where(eq(sections.id, existing.id))
      .run();
  } else {
    db.insert(sections)
      .values({
        id: nanoid(),
        project_id: input.projectId,
        section_key: input.key,
        value: input.value,
        status,
        ai_generated: input.aiGenerated ?? false,
      })
      .run();
  }
  db.update(projects).set({ updated_at: new Date() }).where(eq(projects.id, input.projectId)).run();
  return getSectionRow(input.projectId, input.key)!;
}

// Set of section keys that have at least draft content — used for dependency gating.
export function filledKeys(projectId: string): Set<string> {
  return new Set(
    getSections(projectId)
      .filter((s) => s.status !== "empty")
      .map((s) => s.section_key)
  );
}

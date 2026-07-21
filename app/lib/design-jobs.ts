import "server-only";
import { nanoid } from "nanoid";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { design_jobs } from "@/lib/db/schema";
import {
  deleteAsset,
  generateBrandDeckProposals,
  generateDesignSystemProposals,
  generateLandingPageProposals,
  getAsset,
  type AssetRow,
} from "@/lib/design";
import { getProject } from "@/lib/queries";
import { viabilityActionBlockedReason } from "@/lib/project-gates";
import type { DesignJobKind, DesignJobState } from "@/lib/design-job-types";

export type DesignJobRow = typeof design_jobs.$inferSelect;

const activeRuns = new Map<string, Promise<void>>();

function jobKey(projectId: string, kind: DesignJobKind): string {
  return `${projectId}:${kind}`;
}

export function getDesignJob(projectId: string, jobId: string): DesignJobRow | undefined {
  return db
    .select()
    .from(design_jobs)
    .where(and(eq(design_jobs.id, jobId), eq(design_jobs.project_id, projectId)))
    .get();
}

export function getActiveDesignJob(projectId: string): DesignJobRow | undefined {
  const active = db
    .select()
    .from(design_jobs)
    .where(
      and(
        eq(design_jobs.project_id, projectId),
        or(eq(design_jobs.status, "queued"), eq(design_jobs.status, "running"))
      )
    )
    .orderBy(desc(design_jobs.created_at))
    .get();
  if (active) return active;
  const latestComplete = db
    .select()
    .from(design_jobs)
    .where(and(eq(design_jobs.project_id, projectId), eq(design_jobs.status, "complete")))
    .orderBy(desc(design_jobs.created_at))
    .get();
  return latestComplete && designJobAssets(latestComplete).length < latestComplete.count
    ? latestComplete
    : undefined;
}

export function designJobAssets(job: DesignJobRow): AssetRow[] {
  return (job.asset_ids ?? []).flatMap((assetId) => {
    const asset = getAsset(job.project_id, assetId);
    return asset ? [asset] : [];
  });
}

function updateJob(jobId: string, values: Partial<typeof design_jobs.$inferInsert>): void {
  db.update(design_jobs)
    .set({ ...values, updated_at: new Date() })
    .where(eq(design_jobs.id, jobId))
    .run();
}

export function createDesignJob(input: {
  projectId: string;
  kind: DesignJobKind;
  count: number;
  designSystemId?: string;
}): DesignJobRow {
  const project = getProject(input.projectId);
  if (!project) throw new Error("Project not found");
  const blocked = viabilityActionBlockedReason(project, "design");
  if (blocked) throw new Error(blocked);

  const active = db
    .select()
    .from(design_jobs)
    .where(
      and(
        eq(design_jobs.project_id, input.projectId),
        eq(design_jobs.kind, input.kind),
        or(eq(design_jobs.status, "queued"), eq(design_jobs.status, "running"))
      )
    )
    .orderBy(desc(design_jobs.created_at))
    .get();
  if (active) {
    void startDesignJob(active.id);
    return active;
  }

  const id = nanoid();
  db.insert(design_jobs)
    .values({
      id,
      project_id: input.projectId,
      kind: input.kind,
      count: input.count,
      design_system_id: input.designSystemId,
      status: "queued",
      asset_ids: [],
    })
    .run();
  void startDesignJob(id);
  return db.select().from(design_jobs).where(eq(design_jobs.id, id)).get()!;
}

export function startDesignJob(jobId: string): Promise<void> {
  const existing = activeRuns.get(jobId);
  if (existing) return existing;

  const job = db.select().from(design_jobs).where(eq(design_jobs.id, jobId)).get();
  if (!job || job.status === "failed") return Promise.resolve();
  if (job.status === "complete" && designJobAssets(job).length === job.count) return Promise.resolve();
  if (job.status === "complete") updateJob(job.id, { status: "queued", error: "Incomplete result set; restarting generation." });

  const key = jobKey(job.project_id, job.kind as DesignJobKind);
  const conflicting = [...activeRuns.entries()].find(([id]) => {
    const candidate = db.select().from(design_jobs).where(eq(design_jobs.id, id)).get();
    return candidate && jobKey(candidate.project_id, candidate.kind as DesignJobKind) === key;
  });
  if (conflicting) return conflicting[1];

  const run = (async () => {
    const project = getProject(job.project_id);
    if (!project) throw new Error("Project not found");
    const blocked = viabilityActionBlockedReason(project, "design");
    if (blocked) throw new Error(blocked);

    for (const assetId of job.asset_ids ?? []) deleteAsset(job.project_id, assetId);
    updateJob(job.id, { status: "running", asset_ids: [], error: null });
    const assetIds: string[] = [];
    const onAsset = (asset: AssetRow) => {
      assetIds.push(asset.id);
      updateJob(job.id, { asset_ids: [...assetIds] });
    };

    let generated: AssetRow[];
    if (job.kind === "design_system") {
      generated = await generateDesignSystemProposals(job.project_id, job.count, onAsset);
    } else if (job.kind === "landing_page") {
      if (!job.design_system_id) throw new Error("A final Brand Identity System is required.");
      generated = await generateLandingPageProposals(
        job.project_id,
        job.design_system_id,
        job.count,
        onAsset
      );
    } else {
      if (!job.design_system_id) throw new Error("A final Brand Identity System is required.");
      generated = await generateBrandDeckProposals(
        job.project_id,
        job.design_system_id,
        job.count,
        onAsset
      );
    }
    updateJob(job.id, { status: "complete", asset_ids: generated.map((asset) => asset.id) });
  })()
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Design generation failed";
      updateJob(job.id, { status: "failed", error: message });
    })
    .finally(() => activeRuns.delete(jobId));

  activeRuns.set(jobId, run);
  return run;
}

export function serializeDesignJob(job: DesignJobRow): DesignJobState {
  return {
    id: job.id,
    project_id: job.project_id,
    kind: job.kind as DesignJobKind,
    count: job.count,
    design_system_id: job.design_system_id,
    status: job.status,
    asset_ids: job.asset_ids,
    error: job.error,
  };
}

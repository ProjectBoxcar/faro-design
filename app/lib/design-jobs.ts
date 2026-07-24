import "server-only";
import { nanoid } from "nanoid";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { design_jobs } from "@/lib/db/schema";
import {
  deleteAsset,
  generateApplicationMockups,
  generateBrandDeckProposals,
  generateDesignSystemProposals,
  generateLandingPageProposals,
  getAsset,
  listAssets,
  type AssetRow,
} from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { getProject, setProjectPhase } from "@/lib/queries";
import { viabilityActionBlockedReason } from "@/lib/project-gates";
import type { DesignJobKind, DesignJobState } from "@/lib/design-job-types";

export type DesignJobRow = typeof design_jobs.$inferSelect;

const activeRuns = new Map<string, Promise<void>>();
/** Jobs the owner asked to stop — checked between proposal steps. */
const cancelledJobs = new Set<string>();

class DesignGenerationCancelled extends Error {
  constructor() {
    super("Generation stopped.");
    this.name = "DesignGenerationCancelled";
  }
}

function throwIfJobCancelled(jobId: string) {
  if (cancelledJobs.has(jobId)) throw new DesignGenerationCancelled();
}

function jobKey(projectId: string, kind: DesignJobKind): string {
  return `${projectId}:${kind}`;
}

/** Ask a running design job to stop after the current proposal finishes. */
export function cancelDesignJob(projectId: string, jobId: string): DesignJobRow | undefined {
  const job = getDesignJob(projectId, jobId);
  if (!job) return undefined;
  if (job.status !== "queued" && job.status !== "running") return job;
  cancelledJobs.add(jobId);
  updateJob(jobId, {
    status: "failed",
    error: "Generation stopped.",
  });
  return getDesignJob(projectId, jobId);
}

export function getDesignJob(projectId: string, jobId: string): DesignJobRow | undefined {
  return db
    .select()
    .from(design_jobs)
    .where(and(eq(design_jobs.id, jobId), eq(design_jobs.project_id, projectId)))
    .get();
}

/**
 * In-flight generation only (queued/running).
 * Incomplete "complete" jobs must NOT be treated as active — that used to re-start
 * generation whenever the owner deleted a proposal (asset_ids shrank below count),
 * which locked the Design Studio UI and disabled every Delete control.
 */
export function getActiveDesignJob(projectId: string): DesignJobRow | undefined {
  return db
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
  // Finished jobs are never auto-restarted (missing assets usually mean the
  // owner deleted proposals — not a crash). Start a new job via createDesignJob.
  if (job.status === "complete") return Promise.resolve();

  const key = jobKey(job.project_id, job.kind as DesignJobKind);
  const conflicting = [...activeRuns.entries()].find(([id]) => {
    const candidate = db.select().from(design_jobs).where(eq(design_jobs.id, id)).get();
    return candidate && jobKey(candidate.project_id, candidate.kind as DesignJobKind) === key;
  });
  if (conflicting) return conflicting[1];

  const run = (async () => {
    // Re-read: owner may have cancelled between queue start and this tick.
    const latest = db.select().from(design_jobs).where(eq(design_jobs.id, jobId)).get();
    if (!latest || latest.status === "failed") {
      if (latest?.error === "Generation stopped." || cancelledJobs.has(jobId)) {
        throw new DesignGenerationCancelled();
      }
      if (!latest) throw new Error("Design job not found");
      return;
    }
    const project = getProject(latest.project_id);
    if (!project) throw new Error("Project not found");
    const blocked = viabilityActionBlockedReason(project, "design");
    if (blocked) throw new Error(blocked);
    throwIfJobCancelled(jobId);

    for (const assetId of latest.asset_ids ?? []) deleteAsset(latest.project_id, assetId);
    // Avoid clobbering a concurrent cancel that already marked the job failed.
    if (cancelledJobs.has(jobId)) throw new DesignGenerationCancelled();
    const still = db.select().from(design_jobs).where(eq(design_jobs.id, jobId)).get();
    if (!still || still.status === "failed") throw new DesignGenerationCancelled();
    updateJob(job.id, { status: "running", asset_ids: [], error: null });
    const assetIds: string[] = [];
    const onAsset = (asset: AssetRow) => {
      throwIfJobCancelled(jobId);
      assetIds.push(asset.id);
      // Don't resurrect a cancelled job when streaming partial assets.
      if (cancelledJobs.has(jobId)) throw new DesignGenerationCancelled();
      updateJob(job.id, { asset_ids: [...assetIds] });
    };

    let generated: AssetRow[];
    if (latest.kind === "design_system") {
      generated = await generateDesignSystemProposals(latest.project_id, latest.count, onAsset);
    } else if (latest.kind === "mockups") {
      if (!latest.design_system_id) throw new Error("A final Brand Identity System is required.");
      generated = await generateApplicationMockups(latest.project_id, latest.design_system_id, onAsset);
    } else if (latest.kind === "landing_page") {
      if (!latest.design_system_id) throw new Error("A final Brand Identity System is required.");
      generated = await generateLandingPageProposals(
        latest.project_id,
        latest.design_system_id,
        latest.count,
        onAsset
      );
    } else {
      if (!latest.design_system_id) throw new Error("A final Brand Identity System is required.");
      generated = await generateBrandDeckProposals(
        latest.project_id,
        latest.design_system_id,
        latest.count,
        onAsset
      );
    }
    throwIfJobCancelled(jobId);
    updateJob(job.id, { status: "complete", asset_ids: generated.map((asset) => asset.id) });
    // The journey completes when the full package — strategy already
    // published, plus every final design output — is on file.
    const finished = getProject(job.project_id);
    if (finished?.share_token && !finalDeliverableIssue(listAssets(job.project_id))) {
      setProjectPhase(job.project_id, "finished");
    }
  })()
    .catch((error) => {
      if (error instanceof DesignGenerationCancelled || cancelledJobs.has(jobId)) {
        updateJob(job.id, { status: "failed", error: "Generation stopped." });
        return;
      }
      const message = error instanceof Error ? error.message : "Design generation failed";
      updateJob(job.id, { status: "failed", error: message });
    })
    .finally(() => {
      activeRuns.delete(jobId);
      cancelledJobs.delete(jobId);
    });

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

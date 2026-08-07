import "server-only";
import { nanoid } from "nanoid";
import { and, desc, eq, or, sql } from "drizzle-orm";
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
  selectAsset,
  type AssetRow,
} from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { getProject, setProjectPhase } from "@/lib/queries";
import type { DesignJobKind, DesignJobState } from "@/lib/design-job-types";
import { classifyAiFailure, formatClassifiedFailure } from "@/lib/ai-failure";
import { shouldResumeDesignJob } from "@/lib/design-job-resume-pure";
import { canEnterDesignStudio } from "@/lib/studio";

export type DesignJobRow = typeof design_jobs.$inferSelect;

const activeRuns = new Map<string, Promise<void>>();
/** Jobs the owner asked to stop — checked between proposal steps. */
const cancelledJobs = new Set<string>();

type RefineMeta = { feedback?: string; baseHtml?: string; baseAssetId?: string };

function ensureRefineMetaColumn(): void {
  try {
    db.run(sql`ALTER TABLE design_jobs ADD COLUMN refine_meta text`);
  } catch {
    /* exists */
  }
}

function readRefineMeta(jobId: string): RefineMeta | null {
  ensureRefineMetaColumn();
  const row = db.select().from(design_jobs).where(eq(design_jobs.id, jobId)).get() as
    | (DesignJobRow & { refine_meta?: RefineMeta | string | null })
    | undefined;
  if (!row?.refine_meta) return null;
  if (typeof row.refine_meta === "string") {
    try {
      return JSON.parse(row.refine_meta) as RefineMeta;
    } catch {
      return null;
    }
  }
  return row.refine_meta;
}

function writeRefineMeta(jobId: string, meta: RefineMeta | null): void {
  ensureRefineMetaColumn();
  updateJob(jobId, {
    refine_meta: meta,
  } as Partial<typeof design_jobs.$inferInsert>);
}

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

/** Failed job with partial proposals that can continue on Open Design only. */
function findResumableFailedJob(
  projectId: string,
  kind: DesignJobKind,
  designSystemId?: string
): DesignJobRow | undefined {
  const row = db
    .select()
    .from(design_jobs)
    .where(
      and(
        eq(design_jobs.project_id, projectId),
        eq(design_jobs.kind, kind),
        eq(design_jobs.status, "failed")
      )
    )
    .orderBy(desc(design_jobs.created_at))
    .get();
  if (!row) return undefined;
  if (designSystemId && row.design_system_id && row.design_system_id !== designSystemId) {
    return undefined;
  }
  const have = (row.asset_ids ?? []).filter((id) => Boolean(getAsset(projectId, id))).length;
  // Keep partial progress; also allow full retry when failed with zero assets.
  if (have >= row.count && have > 0) return undefined;
  // Owner-stopped with nothing yet → fresh start is fine via new job.
  if (have === 0 && /stopped/i.test(row.error ?? "")) return undefined;
  return row;
}

export function createDesignJob(input: {
  projectId: string;
  kind: DesignJobKind;
  count: number;
  designSystemId?: string;
  /** Owner notes when refining a liked identity proposal. */
  feedback?: string;
  refineFromAssetId?: string;
  /** Force a clean job (wipe/retry from zero). Default: resume partial failed job. */
  forceNew?: boolean;
}): DesignJobRow {
  const project = getProject(input.projectId);
  if (!project) throw new Error("Project not found");
  const enter = canEnterDesignStudio(input.projectId);
  if (!enter.ok) throw new Error(enter.reason || "Design Studio is locked");

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
    // Never wipe mid-flight work when re-attaching to an active job.
    void startDesignJob(active.id, { resume: true });
    return active;
  }

  // Resume same Open Design job when proposals already landed mid-run.
  // Skip when refining (feedback) — that always wants a fresh proposal set.
  if (!input.forceNew && !input.feedback?.trim() && !input.refineFromAssetId) {
    const resumable = findResumableFailedJob(
      input.projectId,
      input.kind,
      input.designSystemId
    );
    if (resumable) {
      cancelledJobs.delete(resumable.id);
      const kept = (resumable.asset_ids ?? []).filter((id) =>
        Boolean(getAsset(input.projectId, id))
      );
      updateJob(resumable.id, {
        status: "queued",
        error: null,
        asset_ids: kept,
        count: Math.max(resumable.count, input.count),
        design_system_id: input.designSystemId ?? resumable.design_system_id,
      });
      void startDesignJob(resumable.id, { resume: true });
      return getDesignJob(input.projectId, resumable.id)!;
    }
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

  if (input.feedback?.trim() || input.refineFromAssetId) {
    const base = input.refineFromAssetId
      ? getAsset(input.projectId, input.refineFromAssetId)
      : null;
    writeRefineMeta(id, {
      feedback: input.feedback?.trim() || undefined,
      baseHtml: base?.html ?? undefined,
      baseAssetId: base?.id,
    });
  }

  void startDesignJob(id);
  return db.select().from(design_jobs).where(eq(design_jobs.id, id)).get()!;
}

export function startDesignJob(
  jobId: string,
  options?: { resume?: boolean }
): Promise<void> {
  const existing = activeRuns.get(jobId);
  if (existing) return existing;

  const job = db.select().from(design_jobs).where(eq(design_jobs.id, jobId)).get();
  // Resume path re-queues failed jobs before calling start.
  if (!job) return Promise.resolve();
  if (job.status === "failed" && !options?.resume) return Promise.resolve();
  // Finished jobs are never auto-restarted (missing assets usually mean the
  // owner deleted proposals — not a crash). Start a new job via createDesignJob.
  if (job.status === "complete") return Promise.resolve();

  const key = jobKey(job.project_id, job.kind as DesignJobKind);
  const conflicting = [...activeRuns.entries()].find(([id]) => {
    const candidate = db.select().from(design_jobs).where(eq(design_jobs.id, id)).get();
    return candidate && jobKey(candidate.project_id, candidate.kind as DesignJobKind) === key;
  });
  if (conflicting) return conflicting[1];

  // Pack 3: orphaned queued/running jobs (page refresh / server restart) must
  // keep landed assets. Only a brand-new empty job may start without resume.
  const landedAtStart = (job.asset_ids ?? []).filter((id) =>
    Boolean(getAsset(job.project_id, id))
  ).length;
  const resume = shouldResumeDesignJob({
    status: job.status,
    explicitResume: Boolean(options?.resume),
    isOrphan: true, // no activeRuns entry if we reached here
    landedAssetCount: landedAtStart,
  });

  const run = (async () => {
    // Re-read: owner may have cancelled between queue start and this tick.
    const latest = db.select().from(design_jobs).where(eq(design_jobs.id, jobId)).get();
    if (!latest) throw new Error("Design job not found");
    if (latest.status === "failed" && !resume) {
      if (latest.error === "Generation stopped." || cancelledJobs.has(jobId)) {
        throw new DesignGenerationCancelled();
      }
      return;
    }
    const project = getProject(latest.project_id);
    if (!project) throw new Error("Project not found");
    const gate = canEnterDesignStudio(latest.project_id);
    if (!gate.ok) throw new Error(gate.reason || "Design Studio is locked");
    throwIfJobCancelled(jobId);

    // Always re-check landed assets at run time (IDs may have been deleted by owner).
    const landedIds = (latest.asset_ids ?? []).filter((id) =>
      Boolean(getAsset(latest.project_id, id))
    );
    // Never wipe proposals that already exist — force resume if anything landed.
    const effectiveResume = resume || landedIds.length > 0;
    if (!effectiveResume && landedIds.length === 0) {
      // Brand-new empty job: clear any stale dangling ids (assets already gone).
      for (const assetId of latest.asset_ids ?? []) {
        if (getAsset(latest.project_id, assetId)) deleteAsset(latest.project_id, assetId);
      }
    } else if (!resume && landedIds.length > 0) {
      console.warn(
        `[design-jobs] refusing to wipe ${landedIds.length} landed asset(s) on job ${jobId}; forcing resume`
      );
    }
    const safeKept = effectiveResume ? landedIds : [];
    // Avoid clobbering a concurrent cancel that already marked the job failed.
    if (cancelledJobs.has(jobId)) throw new DesignGenerationCancelled();
    const still = db.select().from(design_jobs).where(eq(design_jobs.id, jobId)).get();
    if (!still || (still.status === "failed" && !resume)) throw new DesignGenerationCancelled();
    updateJob(job.id, {
      status: "running",
      asset_ids: safeKept,
      error: null,
    });
    const assetIds: string[] = [...safeKept];
    const onAsset = (asset: AssetRow) => {
      throwIfJobCancelled(jobId);
      assetIds.push(asset.id);
      // Don't resurrect a cancelled job when streaming partial assets.
      if (cancelledJobs.has(jobId)) throw new DesignGenerationCancelled();
      updateJob(job.id, { asset_ids: [...assetIds] });
    };

    const remaining = Math.max(0, latest.count - safeKept.length);
    let generated: AssetRow[] = [];

    if (remaining === 0 && safeKept.length > 0) {
      generated = safeKept.map((id) => getAsset(latest.project_id, id)!).filter(Boolean);
    } else if (latest.kind === "design_system") {
      const refine = readRefineMeta(jobId);
      const fresh = await generateDesignSystemProposals(
        latest.project_id,
        remaining || latest.count,
        onAsset,
        refine
          ? { feedback: refine.feedback, baseHtml: refine.baseHtml }
          : null
      );
      writeRefineMeta(jobId, null);
      generated = [...safeKept.map((id) => getAsset(latest.project_id, id)!).filter(Boolean), ...fresh];
    } else if (latest.kind === "mockups") {
      if (!latest.design_system_id) throw new Error("A final Brand Identity System is required.");
      // Resume mockups: only generate missing landing / deck.
      const existingAssets = safeKept
        .map((id) => getAsset(latest.project_id, id))
        .filter((a): a is AssetRow => Boolean(a));
      const hasLanding = existingAssets.some((a) => a.kind === "landing_page");
      const hasDeck = existingAssets.some((a) => a.kind === "deck");
      if (!hasLanding && !hasDeck) {
        generated = await generateApplicationMockups(
          latest.project_id,
          latest.design_system_id,
          onAsset
        );
      } else {
        generated = [...existingAssets];
        if (!hasLanding) {
          const [landing] = await generateLandingPageProposals(
            latest.project_id,
            latest.design_system_id,
            1,
            onAsset
          );
          if (landing) {
            selectAsset(latest.project_id, landing.id);
            generated.push(getAsset(latest.project_id, landing.id)!);
          }
        }
        if (!hasDeck) {
          const [deck] = await generateBrandDeckProposals(
            latest.project_id,
            latest.design_system_id,
            1,
            onAsset
          );
          if (deck) {
            selectAsset(latest.project_id, deck.id);
            generated.push(getAsset(latest.project_id, deck.id)!);
          }
        }
      }
    } else if (latest.kind === "landing_page") {
      if (!latest.design_system_id) throw new Error("A final Brand Identity System is required.");
      const fresh = await generateLandingPageProposals(
        latest.project_id,
        latest.design_system_id,
        remaining || latest.count,
        onAsset
      );
      generated = [
        ...safeKept.map((id) => getAsset(latest.project_id, id)!).filter(Boolean),
        ...fresh,
      ];
    } else {
      if (!latest.design_system_id) throw new Error("A final Brand Identity System is required.");
      const fresh = await generateBrandDeckProposals(
        latest.project_id,
        latest.design_system_id,
        remaining || latest.count,
        onAsset
      );
      generated = [
        ...safeKept.map((id) => getAsset(latest.project_id, id)!).filter(Boolean),
        ...fresh,
      ];
    }
    throwIfJobCancelled(jobId);
    updateJob(job.id, {
      status: "complete",
      asset_ids: generated.map((asset) => asset.id),
    });
    // When finals land (especially auto-selected mockups), refresh phase and
    // re-freeze the share package if a strategy brief was already published.
    try {
      const { syncProjectLifecycle } = await import("@/lib/project-lifecycle");
      syncProjectLifecycle(job.project_id);
    } catch (e) {
      console.warn("[lifecycle] design job complete sync failed:", e);
      const finished = getProject(job.project_id);
      if (finished?.share_token && !finalDeliverableIssue(listAssets(job.project_id))) {
        setProjectPhase(job.project_id, "finished");
      }
    }
  })()
    .catch((error) => {
      if (error instanceof DesignGenerationCancelled || cancelledJobs.has(jobId)) {
        const c = classifyAiFailure(error, "design");
        updateJob(job.id, {
          status: "failed",
          error: formatClassifiedFailure(c),
        });
        return;
      }
      const c = classifyAiFailure(error, "design");
      updateJob(job.id, {
        status: "failed",
        error: formatClassifiedFailure(c),
      });
    })
    .finally(() => {
      activeRuns.delete(jobId);
      cancelledJobs.delete(jobId);
    });

  activeRuns.set(jobId, run);
  return run;
}

/**
 * Mark queued/running design jobs as failed when no in-process run exists
 * (server restart). Owner can resume from Design Studio.
 */
export function reconcileOrphanDesignJobs(): number {
  ensureRefineMetaColumn();
  const stuck = db
    .select()
    .from(design_jobs)
    .where(or(eq(design_jobs.status, "queued"), eq(design_jobs.status, "running")))
    .all();
  let n = 0;
  for (const job of stuck) {
    if (activeRuns.has(job.id)) continue;
    updateJob(job.id, {
      status: "failed",
      error:
        job.error?.trim() ||
        "Interrupted by server restart — reopen Design Studio to resume generation.",
    });
    n++;
  }
  if (n > 0) console.info(`[design-jobs] reconciled ${n} orphan job(s)`);
  return n;
}

export function serializeDesignJob(job: DesignJobRow): DesignJobState {
  const have = (job.asset_ids ?? []).length;
  const failed = job.status === "failed";
  const partial = failed && have > 0 && have < job.count;
  const classified = job.error ? classifyAiFailure(new Error(job.error), "design") : null;
  return {
    id: job.id,
    project_id: job.project_id,
    kind: job.kind as DesignJobKind,
    count: job.count,
    design_system_id: job.design_system_id,
    status: job.status,
    asset_ids: job.asset_ids,
    error: job.error,
    engine: "open-design-daemon",
    resumable: failed && (partial || Boolean(job.error && !/stopped/i.test(job.error))),
    errorCode: classified?.code ?? null,
    errorHint: classified?.hint ?? null,
  };
}

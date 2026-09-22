import "server-only";
import { and, desc, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { logo_jobs } from "@/lib/db/schema";
import { cancelLogoGeneration, generateLogoCandidates } from "@/lib/studio";

export type LogoJobStatus = "queued" | "running" | "complete" | "failed";

export type LogoJobView = {
  id: string;
  status: LogoJobStatus;
  action: "generate" | "variations";
  sourceAssetId: string | null;
  error: string | null;
  discarded: number;
};

const activeRuns = new Map<string, Promise<void>>();

function rowToView(row: typeof logo_jobs.$inferSelect): LogoJobView {
  return {
    id: row.id,
    status: row.status as LogoJobStatus,
    action: row.action === "variations" ? "variations" : "generate",
    sourceAssetId: row.source_asset_id,
    error: row.error,
    discarded: row.discarded ?? 0,
  };
}

export function latestLogoJob(projectId: string): LogoJobView | null {
  const row = db
    .select()
    .from(logo_jobs)
    .where(eq(logo_jobs.project_id, projectId))
    .orderBy(desc(logo_jobs.created_at))
    .get();
  return row ? rowToView(row) : null;
}

function touch(
  id: string,
  patch: Partial<{
    status: LogoJobStatus;
    error: string | null;
    discarded: number;
  }>
) {
  db.update(logo_jobs)
    .set({ ...patch, updated_at: new Date() })
    .where(eq(logo_jobs.id, id))
    .run();
}

/**
 * Start logo generation in the background and return immediately.
 * An already running job is reused. Existing logo candidates are never deleted.
 */
export function startLogoJob(input: {
  projectId: string;
  variationsOf?: string;
  feedback?: string;
}): LogoJobView {
  const active = db
    .select()
    .from(logo_jobs)
    .where(
      and(
        eq(logo_jobs.project_id, input.projectId),
        or(eq(logo_jobs.status, "queued"), eq(logo_jobs.status, "running"))
      )
    )
    .orderBy(desc(logo_jobs.created_at))
    .get();
  if (active) {
    void runLogoJob(active.id);
    return rowToView(active);
  }

  const id = nanoid();
  db.insert(logo_jobs)
    .values({
      id,
      project_id: input.projectId,
      action: input.variationsOf ? "variations" : "generate",
      source_asset_id: input.variationsOf ?? null,
      feedback: input.feedback?.trim() || null,
      status: "queued",
      discarded: 0,
    })
    .run();
  void runLogoJob(id);
  return rowToView(db.select().from(logo_jobs).where(eq(logo_jobs.id, id)).get()!);
}

export function cancelActiveLogoJob(projectId: string): void {
  cancelLogoGeneration(projectId);
  const active = db
    .select()
    .from(logo_jobs)
    .where(
      and(
        eq(logo_jobs.project_id, projectId),
        or(eq(logo_jobs.status, "queued"), eq(logo_jobs.status, "running"))
      )
    )
    .all();
  for (const job of active) {
    touch(job.id, { status: "failed", error: "Generation stopped." });
  }
}

async function runLogoJob(jobId: string): Promise<void> {
  const existing = activeRuns.get(jobId);
  if (existing) return existing;

  const run = (async () => {
    const job = db.select().from(logo_jobs).where(eq(logo_jobs.id, jobId)).get();
    if (!job || job.status === "complete" || job.status === "failed") return;
    touch(jobId, { status: "running", error: null });
    try {
      const result = await generateLogoCandidates(
        job.project_id,
        job.source_asset_id ?? undefined,
        job.feedback ?? undefined
      );
      const latest = db.select().from(logo_jobs).where(eq(logo_jobs.id, jobId)).get();
      if (latest?.status === "failed") return;
      touch(jobId, { status: "complete", error: null, discarded: result.discarded });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Logo generation failed";
      const stopped = e instanceof Error && (e.name === "LogoGenerationCancelled" || message === "Generation stopped.");
      touch(jobId, {
        status: "failed",
        error: stopped ? "Generation stopped." : message,
      });
    }
  })().finally(() => {
    activeRuns.delete(jobId);
  });

  activeRuns.set(jobId, run);
  return run;
}

/** After a restart, a queued or running logo job is no longer in memory. Keep any logos already saved. */
export function reconcileOrphanLogoJobs(): number {
  let stuck: { id: string }[] = [];
  try {
    stuck = db
      .select({ id: logo_jobs.id })
      .from(logo_jobs)
      .where(or(eq(logo_jobs.status, "queued"), eq(logo_jobs.status, "running")))
      .all();
  } catch {
    return 0;
  }
  let n = 0;
  for (const job of stuck) {
    if (activeRuns.has(job.id)) continue;
    touch(job.id, {
      status: "failed",
      error:
        "Interrupted by a restart. Logos already saved are still here — generate again to continue.",
    });
    n++;
  }
  if (n > 0) console.info(`[logo-jobs] reconciled ${n} orphan job(s)`);
  return n;
}

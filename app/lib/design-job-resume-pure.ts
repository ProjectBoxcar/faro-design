/**
 * Pure rules for whether a design job restart should keep landed assets.
 * Orphaned queued/running jobs after server restart must never wipe proposals.
 */

export type DesignJobResumeInput = {
  status: "queued" | "running" | "complete" | "failed" | string;
  /** Explicit resume from createDesignJob / failed re-queue */
  explicitResume?: boolean;
  /** Process has no in-memory run for this job (page reload / server restart) */
  isOrphan?: boolean;
  /** How many asset ids still resolve in the DB */
  landedAssetCount: number;
};

/**
 * Keep partial proposals when:
 * - caller asked for resume, or
 * - job was mid-flight and the process lost the run (orphan), or
 * - any proposals already landed (never delete progress just to restart the loop)
 */
export function shouldResumeDesignJob(input: DesignJobResumeInput): boolean {
  if (input.explicitResume) return true;
  if (input.landedAssetCount > 0) return true;
  if (input.isOrphan && (input.status === "queued" || input.status === "running")) {
    return true;
  }
  return false;
}

/**
 * Shared generation progress math.
 * Bars must never go backwards mid-run (no modulo sawtooths).
 */

/** Discrete pipeline stages for UI bullets. */
export type ProgressStage = {
  id: string;
  label: string;
  /** 0–1: stage is "active" from this fraction until the next stage's start */
  startAt: number;
};

export function stageStatus(
  stages: ProgressStage[],
  progress01: number
): Array<{ id: string; label: string; state: "done" | "active" | "pending" }> {
  const p = clamp01(progress01);
  return stages.map((stage, i) => {
    const nextStart = stages[i + 1]?.startAt ?? 1;
    if (p >= nextStart - 0.001 || (i === stages.length - 1 && p >= 0.99)) {
      return { id: stage.id, label: stage.label, state: "done" as const };
    }
    if (p >= stage.startAt) {
      return { id: stage.id, label: stage.label, state: "active" as const };
    }
    return { id: stage.id, label: stage.label, state: "pending" as const };
  });
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Count-based progress with smooth fill of the current unit.
 * - `done` / `total` are real completed units (sections, proposals, assets)
 * - `secondsInCurrent` = seconds since `done` last increased (not wall clock modulo)
 * Never jumps backward when secondsInCurrent resets after a completion.
 */
export function countBasedPercent(params: {
  done: number;
  total: number;
  secondsInCurrent?: number;
  /** Expected seconds to finish one unit (for soft creep only) */
  secondsPerUnit?: number;
}): number {
  const total = Math.max(0, params.total);
  const done = Math.min(Math.max(0, params.done), total);
  if (total <= 0) return 0;
  if (done >= total) return 100;

  const base = (done / total) * 100;
  const slot = 100 / total;
  const est = Math.max(20, params.secondsPerUnit ?? 45);
  const t = Math.max(0, params.secondsInCurrent ?? 0);
  // Soft asymptotic fill of the open slot — never claims the full slot.
  const within = (1 - Math.exp(-t / (est * 0.65))) * 0.88;
  return Math.min(99, Math.max(1, Math.round(base + slot * within)));
}

/**
 * Time-based estimate when we only know "still running" (e.g. logo one-shot).
 * Caps below 100 until the caller marks complete.
 */
export function timeBasedPercent(elapsedSeconds: number, estimateSeconds: number): number {
  const est = Math.max(30, estimateSeconds);
  const t = Math.max(0, elapsedSeconds);
  const soft = (1 - Math.exp(-t / (est * 0.55))) * 94;
  return Math.min(94, Math.max(2, Math.round(soft)));
}

/** Keep a displayed percent from ever decreasing during one run. */
export function peakPercent(previousPeak: number, next: number): number {
  return Math.max(previousPeak, next);
}

/** Logo workshop stages (single multi-minute call). */
export const LOGO_STAGES: ProgressStage[] = [
  { id: "read", label: "Reading your strategy", startAt: 0 },
  { id: "design", label: "Designing logo candidates", startAt: 0.12 },
  { id: "score", label: "Scoring against the brief", startAt: 0.72 },
];

/** Design Studio direction stages — map done/total onto 3 proposals. */
export function designDirectionProgress(done: number, total: number): {
  done: boolean;
  active: boolean;
}[] {
  const t = Math.max(total, 3);
  const d = Math.max(0, done);
  return [0, 1, 2].map((i) => ({
    done: d > i,
    active: d === i && d < t,
  }));
}

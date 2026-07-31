/**
 * Pure helpers for durable Express pipeline state (section express.pipeline).
 */

export type ExpressPipelineStatus = "idle" | "running" | "done" | "failed" | "cancelled";

export type ExpressPipelineRecord = {
  status: ExpressPipelineStatus;
  done?: number;
  total?: number;
  error?: string | null;
  errorCode?: string | null;
  errorHint?: string | null;
  updatedAt?: string;
};

export const EXPRESS_PIPELINE_SECTION_KEY = "express.pipeline";

/** Disk status when there is no in-memory run (after restart). */
export function deriveExpressStatusFromDisk(input: {
  sectionsFilled: number;
  sectionsTotal: number;
  persisted?: ExpressPipelineRecord | null;
}): {
  status: ExpressPipelineStatus;
  done: number;
  total: number;
  error: string | null;
  errorCode: string | null;
  errorHint: string | null;
  resumable: boolean;
} {
  const { sectionsFilled, sectionsTotal, persisted } = input;
  const complete = sectionsTotal > 0 && sectionsFilled >= sectionsTotal;
  if (complete) {
    return {
      status: "done",
      done: sectionsFilled,
      total: sectionsTotal,
      error: null,
      errorCode: null,
      errorHint: null,
      resumable: false,
    };
  }

  // Owner stopped — do not surface as idle (client auto-starts idle incomplete).
  if (persisted?.status === "cancelled") {
    return {
      status: "cancelled",
      done: sectionsFilled,
      total: sectionsTotal,
      error: null,
      errorCode: persisted.errorCode ?? null,
      errorHint: persisted.errorHint ?? null,
      resumable: sectionsFilled > 0 || sectionsFilled < sectionsTotal,
    };
  }

  if (persisted?.status === "failed") {
    return {
      status: "failed",
      done: sectionsFilled,
      total: sectionsTotal,
      error: persisted.error ?? "Strategy drafting failed.",
      errorCode: persisted.errorCode ?? null,
      errorHint: persisted.errorHint ?? null,
      resumable: true,
    };
  }

  // Mid-run crash → idle + resumable so intentional/auto resume can continue.
  // Cancelled is handled above and must not fall through to idle.
  return {
    status: "idle",
    done: sectionsFilled,
    total: sectionsTotal,
    error: null,
    errorCode: null,
    errorHint: null,
    resumable: sectionsFilled > 0,
  };
}

export function shouldAutoStartExpress(status: ExpressPipelineStatus): boolean {
  // Only idle incomplete is auto-started by the client (crash recovery).
  // cancelled / failed require an explicit Resume click.
  return status === "idle";
}

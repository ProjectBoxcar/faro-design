/**
 * Pure lifecycle helpers (no DB) — safe for unit tests.
 * @see lib/project-lifecycle.ts for DB-backed sync.
 */

export type ProjectPhase = "strategic" | "planning" | "design" | "finished";

export type PhaseSignals = {
  strategyReady: boolean;
  logoApproved: boolean;
  designPackageReady: boolean;
  hasShareToken: boolean;
};

/** Pure phase derivation. */
export function deriveProjectPhase(s: PhaseSignals): ProjectPhase {
  if (s.designPackageReady && s.hasShareToken) return "finished";
  if (s.logoApproved || s.designPackageReady) return "design";
  if (s.strategyReady) return "planning";
  return "strategic";
}

/** Home / list: design stage done only when finals exist — not mere publish. */
export function isDesignJourneyDone(input: {
  currentPhase: string;
  designPackageReady: boolean;
}): boolean {
  if (input.currentPhase === "finished") return true;
  return input.designPackageReady;
}

/** Human-facing labels for share state (UI copy). */
export function shareStateCopy(input: {
  hasShareToken: boolean;
  packageReady: boolean;
  /** When a snapshot exists: whether package was frozen. null/undefined = unknown. */
  snapshotPackageReady?: boolean | null;
  version?: number | null;
}): {
  title: string;
  blurb: string;
  kind: "none" | "strategy_brief" | "brand_package";
} {
  if (!input.hasShareToken) {
    return {
      kind: "none",
      title: "Share your strategy brief",
      blurb:
        "Publish freezes a read-only strategy brief your designer can open. The full brand package freezes later, after Design Studio finals.",
    };
  }
  // Package is live-ready and either not frozen yet or already frozen complete.
  if (input.packageReady && input.snapshotPackageReady !== false) {
    return {
      kind: "brand_package",
      title: `Brand package published${input.version != null ? ` (v${input.version})` : ""}`,
      blurb:
        "The share link freezes strategy + design package. Later edits in Faro do not change what your designer sees until you publish again.",
    };
  }
  if (input.packageReady && input.snapshotPackageReady === false) {
    return {
      kind: "strategy_brief",
      title: `Strategy brief shared${input.version != null ? ` (v${input.version})` : ""} — package not frozen yet`,
      blurb:
        "Design finals are ready. Publish again (or use Update package on Handover) to freeze the full brand package on this link.",
    };
  }
  return {
    kind: "strategy_brief",
    title: `Strategy brief shared${input.version != null ? ` (v${input.version})` : ""}`,
    blurb:
      "Your designer can open the strategy brief now. When identity, landing page, and deck are final, the full brand package freezes on the same link.",
  };
}

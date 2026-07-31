/**
 * Project lifecycle honesty — phase markers and publish freeze refresh.
 *
 * Phases (stored on projects.current_phase):
 *   strategic → working on strategy
 *   planning  → strategy content ready (name / logo stage)
 *   design    → logo approved (Design Studio open)
 *   finished  → full design package chosen AND share token exists
 *
 * Express approve still mints a share link for the **strategy brief**.
 * That is not the same as a finished brand package. When the design package
 * later becomes complete and a share token already exists, we auto-create the
 * next publish snapshot so the frozen package is no longer stuck incomplete.
 */
import "server-only";
import { listAssets } from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import {
  getProject,
  getSectionRow,
  setProjectPhase,
  type Project,
} from "@/lib/queries";
import { hasApprovedLogo } from "@/lib/studio";
import {
  createPublishSnapshot,
  getCurrentSnapshotForProject,
} from "@/lib/publish-snapshot";
import {
  deriveProjectPhase,
  isDesignJourneyDone,
  shareStateCopy,
  type PhaseSignals,
  type ProjectPhase,
} from "@/lib/project-lifecycle-pure";

export type { PhaseSignals, ProjectPhase };
export {
  deriveProjectPhase,
  isDesignJourneyDone,
  shareStateCopy,
};

/** Design package complete from asset rows (same rule as handover). */
export function isDesignPackageCompleteFromAssets(
  assets: Parameters<typeof finalDeliverableIssue>[0]
): boolean {
  return finalDeliverableIssue(assets) === null;
}

function sectionContent(projectId: string, key: string): boolean {
  const row = getSectionRow(projectId, key);
  if (!row?.value) return false;
  if (row.status === "empty") return false;
  const v = row.value as Record<string, unknown>;
  return Object.values(v).some((x) => {
    if (x == null) return false;
    if (typeof x === "string") return x.trim() !== "";
    if (Array.isArray(x)) return x.length > 0;
    return true;
  });
}

export function strategyReadyForLifecycle(projectId: string): boolean {
  if (!sectionContent(projectId, "concept")) return false;
  if (!sectionContent(projectId, "design-plan")) return false;
  return (
    sectionContent(projectId, "brief.central-pattern") ||
    sectionContent(projectId, "brief.main-tension") ||
    sectionContent(projectId, "brief.emotional-territory")
  );
}

export function readPhaseSignals(projectId: string, project?: Project | null): PhaseSignals {
  const p = project ?? getProject(projectId);
  const assets = listAssets(projectId);
  return {
    strategyReady: strategyReadyForLifecycle(projectId),
    logoApproved: hasApprovedLogo(projectId),
    designPackageReady: isDesignPackageCompleteFromAssets(assets),
    hasShareToken: Boolean(p?.share_token),
  };
}

/**
 * If the owner already shared a strategy brief (share_token) and the design
 * package is now complete, freeze a new snapshot so `/share/.../package` is no
 * longer stuck on "not ready when published". No-op when package incomplete or
 * current snapshot already has package.ready.
 */
export function maybeRefreshPublishSnapshot(projectId: string): {
  refreshed: boolean;
  version: number | null;
  packageReady: boolean;
} {
  const project = getProject(projectId);
  if (!project?.share_token) {
    return { refreshed: false, version: null, packageReady: false };
  }
  const assets = listAssets(projectId);
  const packageReady = isDesignPackageCompleteFromAssets(assets);
  if (!packageReady) {
    const cur = getCurrentSnapshotForProject(projectId);
    return {
      refreshed: false,
      version: cur?.version ?? null,
      packageReady: false,
    };
  }
  const current = getCurrentSnapshotForProject(projectId);
  if (current?.payload?.package?.ready) {
    return {
      refreshed: false,
      version: current.version,
      packageReady: true,
    };
  }
  const row = createPublishSnapshot(projectId, project.share_token);
  return {
    refreshed: true,
    version: row.version,
    packageReady: true,
  };
}

/**
 * Recompute phase from live gates and refresh the publish freeze when needed.
 * Safe to call after strategy approve, logo approve, design select, job complete, or publish.
 */
export function syncProjectLifecycle(projectId: string): {
  phase: ProjectPhase;
  signals: PhaseSignals;
  snapshotRefreshed: boolean;
  snapshotVersion: number | null;
  packageReady: boolean;
} {
  const refresh = maybeRefreshPublishSnapshot(projectId);
  const project = getProject(projectId);
  const signals = readPhaseSignals(projectId, project);
  const phase = deriveProjectPhase(signals);
  const current = project?.current_phase;
  if (current !== phase) {
    setProjectPhase(projectId, phase);
  }
  return {
    phase,
    signals,
    snapshotRefreshed: refresh.refreshed,
    snapshotVersion: refresh.version,
    packageReady: refresh.packageReady || signals.designPackageReady,
  };
}

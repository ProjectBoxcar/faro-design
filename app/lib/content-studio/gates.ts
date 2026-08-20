/**
 * Content Studio unlock + readiness gates.
 */
import "server-only";
import { listAssets } from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { getProject } from "@/lib/queries";
import { hasApprovedLogo } from "@/lib/studio";

/**
 * Soft unlock: approved logo + selected identity system.
 * Full package (landing + deck) is recommended but not required for owner-operators
 * who want seasonal posts before every mockup final is done.
 */
export function contentStudioBlockedReason(projectId: string): string | null {
  const project = getProject(projectId);
  if (!project) return "Unknown project";
  if (!hasApprovedLogo(projectId)) {
    return "Approve a logo in the Logo Workshop first.";
  }
  const identity = listAssets(projectId).find((a) => a.kind === "design_system" && a.selected);
  if (!identity) {
    return "Choose a Brand Identity System in Design Studio first.";
  }
  return null;
}

/** True when landing + deck finals exist (full brand package). */
export function contentStudioHasFullPackage(projectId: string): boolean {
  return finalDeliverableIssue(listAssets(projectId)) === null;
}

export function isContentStudioUnlocked(projectId: string): boolean {
  return contentStudioBlockedReason(projectId) === null;
}

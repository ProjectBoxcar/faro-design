/**
 * Content Studio unlock + readiness gates.
 */
import "server-only";
import { listAssets } from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { getProject } from "@/lib/queries";
import { hasApprovedLogo } from "@/lib/studio";

/** Workflow A: brand package complete enough to lock a profile. */
export function contentStudioBlockedReason(projectId: string): string | null {
  const project = getProject(projectId);
  if (!project) return "Unknown project";
  if (!hasApprovedLogo(projectId)) {
    return "Approve a logo in the Logo Workshop first.";
  }
  const issue = finalDeliverableIssue(listAssets(projectId));
  if (issue) {
    return `Finish Design Studio first — ${issue}`;
  }
  return null;
}

export function isContentStudioUnlocked(projectId: string): boolean {
  return contentStudioBlockedReason(projectId) === null;
}

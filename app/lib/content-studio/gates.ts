/**
 * Content Studio unlock + readiness gates.
 */
import "server-only";
import { listAssets } from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { getProject } from "@/lib/queries";

/**
 * Hard unlock: full Brand Handover package ready (identity + landing + deck +
 * SMS/email/ad/print), all strategy-grounded through Design Studio.
 * Content Studio is stage 6 of the journey — not an early soft unlock.
 */
export function contentStudioBlockedReason(projectId: string): string | null {
  const project = getProject(projectId);
  if (!project) return "Unknown project";
  const issue = finalDeliverableIssue(listAssets(projectId));
  if (issue) {
    return "Finish the Brand Handover package first — identity, landing page, deck, and channel templates (SMS, email, ads, print) from your strategy.";
  }
  return null;
}

/** True when the full brand package (incl. channels) is ready. */
export function contentStudioHasFullPackage(projectId: string): boolean {
  return finalDeliverableIssue(listAssets(projectId)) === null;
}

export function isContentStudioUnlocked(projectId: string): boolean {
  return contentStudioBlockedReason(projectId) === null;
}

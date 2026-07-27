import type { AssetKind } from "@/lib/db/types";
import type { Project } from "@/lib/queries";

// Readable brief context extracted from the methodology sections.
export type BriefContext = {
  project: Project;
  name: string;
  client?: string | null;
  problem?: string;
  solution?: string;
  valueProposition?: string;
  differentiator?: string;
  idealClient?: string;
  businessStage?: string;
  origin?: string;
  aspiration?: string;
  beliefs?: string;
  position?: string;
  centralPattern?: string;
  mainTension?: string;
  constraint?: string;
  emotionalTerritory?: string;
  mustResolve?: string;
  conceptStatement?: string;
  conceptDescription?: string;
  conceptDistillation?: string;
  purpose?: string;
  values?: string;
  personality?: string;
  tone?: string;
  promise?: string;
  manifesto?: string;
  strategicDocument?: string;
  designPlan?: string;
  designTaste?: string;
};

// Step-by-step contract: Design Studio builds the system after strategy + logo.
// Strategy essentials must exist; an approved workshop logo is required so
// proposals never invent a competing mark.
export function designSystemBlockedReason(
  ctx: BriefContext,
  opts?: { hasApprovedLogo?: boolean }
): string | null {
  const missing: string[] = [];
  if (!ctx.centralPattern && !ctx.mainTension && !ctx.emotionalTerritory) missing.push("the strategic brief");
  if (!ctx.conceptStatement) missing.push("the brand concept");
  if (!ctx.designPlan) missing.push("the design plan");
  if (missing.length > 0) {
    return `Finish and approve the strategy first — the Studio needs ${missing.join(", ")} before it can design.`;
  }
  if (opts && opts.hasApprovedLogo === false) {
    return "Approve a logo in the Logo Workshop first — Design Studio builds color, type, and components around that mark.";
  }
  return null;
}

// Landing page and deck are downstream artifacts: they read the generated DESIGN.md
// so a selected design system is required. The UI disables these buttons until one is selected.
export function artifactBlockedReason(hasSelectedDesignSystem: boolean, kind: AssetKind): string | null {
  if (!hasSelectedDesignSystem) return `Select a brand identity system before creating a ${kind.replace(/_/g, " ")}.`;
  return null;
}

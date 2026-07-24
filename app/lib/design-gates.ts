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

// Step-by-step contract: the Studio only works from a finished strategy. The
// visual system may not generate until the strategic brief, the brand concept,
// and the design plan all exist — they are what the proposals are built from.
export function designSystemBlockedReason(ctx: BriefContext): string | null {
  const missing: string[] = [];
  if (!ctx.centralPattern && !ctx.mainTension && !ctx.emotionalTerritory) missing.push("the strategic brief");
  if (!ctx.conceptStatement) missing.push("the brand concept");
  if (!ctx.designPlan) missing.push("the design plan");
  if (missing.length === 0) return null;
  return `Finish and approve the strategy first — the Studio needs ${missing.join(", ")} before it can design.`;
}

// Landing page and deck are downstream artifacts: they read the generated DESIGN.md
// so a selected design system is required. The UI disables these buttons until one is selected.
export function artifactBlockedReason(hasSelectedDesignSystem: boolean, kind: AssetKind): string | null {
  if (!hasSelectedDesignSystem) return `Select a brand identity system before creating a ${kind.replace(/_/g, " ")}.`;
  return null;
}

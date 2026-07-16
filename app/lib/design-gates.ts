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
};

// The design studio is intentionally exploratory: incomplete strategy should not
// block generating a visual system. The prompt will include whatever brief context
// exists, and the result is always editable. Hard gates are reserved for the
// case where no API key is configured (handled in the UI).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function designSystemBlockedReason(_ctx: BriefContext): string | null {
  return null;
}

// Landing page and deck are downstream artifacts: they read the generated DESIGN.md
// so a design system is still required. The UI disables these buttons until one exists.
export function artifactBlockedReason(hasDesignSystem: boolean, kind: AssetKind): string | null {
  if (!hasDesignSystem) return `Generate a brand identity system before creating a ${kind.replace(/_/g, " ")}.`;
  return null;
}

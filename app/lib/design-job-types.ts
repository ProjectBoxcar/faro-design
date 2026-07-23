import type { AssetKind } from "@/lib/db/types";

// "mockups" is a composite job: one landing page + one brand deck generated in
// the design plan's execution order as applications of the approved identity.
export type DesignJobKind = Extract<AssetKind, "design_system" | "landing_page" | "deck"> | "mockups";

export type DesignJobState = {
  id: string;
  project_id: string;
  kind: DesignJobKind;
  count: number;
  design_system_id: string | null;
  status: "queued" | "running" | "complete" | "failed";
  asset_ids: string[] | null;
  error: string | null;
};

import type { AssetKind } from "@/lib/db/types";

export type DesignJobKind = Extract<AssetKind, "design_system" | "landing_page" | "deck">;

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

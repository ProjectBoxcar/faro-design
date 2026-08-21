import type { AssetKind } from "@/lib/db/types";

// "mockups" = landing + deck. "channels" = SMS + email + ad + print templates.
export type DesignJobKind =
  | Extract<AssetKind, "design_system" | "landing_page" | "deck" | "sms" | "email" | "ad" | "print">
  | "mockups"
  | "channels";

export type DesignJobState = {
  id: string;
  project_id: string;
  kind: DesignJobKind;
  count: number;
  design_system_id: string | null;
  status: "queued" | "running" | "complete" | "failed";
  asset_ids: string[] | null;
  error: string | null;
  /** Always open-design-daemon for Design Studio jobs */
  engine?: "open-design-daemon";
  /** Partial proposals kept; generate remaining on resume */
  resumable?: boolean;
  errorCode?: string | null;
  errorHint?: string | null;
};

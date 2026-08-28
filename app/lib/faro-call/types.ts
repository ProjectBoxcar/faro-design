/** Faro Call — present the brand like a video meeting. */

export type CallStageId =
  | "strategy"
  | "name"
  | "logo"
  | "design"
  | "handover"
  | "content";

export type CallMediaKind =
  | "none"
  | "text"
  | "logo"
  | "html"
  | "checklist"
  | "cta";

export type CallMedia = {
  kind: CallMediaKind;
  /** Short stage title shown above the shared screen */
  title: string;
  /** Plain text body for text media */
  body?: string;
  /** Inline SVG for logo */
  svg?: string | null;
  svgOnDark?: string | null;
  /** Design asset HTML for iframe stage */
  html?: string | null;
  /** Checklist rows for handover */
  items?: { label: string; ready: boolean }[];
  /** Optional CTA under the stage */
  ctaLabel?: string;
  ctaHref?: string;
};

export type CallBeat = {
  id: string;
  stageId: CallStageId;
  /** Spoken + captioned line (strategy-true, no invented claims) */
  line: string;
  media: CallMedia;
};

export type CallAgendaItem = {
  id: CallStageId;
  name: string;
  status: "locked" | "todo" | "current" | "done";
  detail: string;
};

export type FaroCallContext = {
  projectId: string;
  projectName: string;
  agenda: CallAgendaItem[];
  beats: CallBeat[];
  /** Index of first beat for the journey's current stage */
  startBeatIndex: number;
};

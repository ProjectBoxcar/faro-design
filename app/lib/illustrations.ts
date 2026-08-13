/**
 * Faro Design editorial illustrations — cream paper, teal/coral palette.
 * Served from /public/brand/illustrations/
 */

export type IllustrationId =
  | "heroHarbour"
  | "stepAnswer"
  | "stepStrategy"
  | "stepHandoff"
  | "emptyHarbour"
  | "startInterview"
  | "settingsKeys"
  | "stageStrategy"
  | "stageName"
  | "stageLogo"
  | "stageDesign"
  | "stageHandover"
  | "stageContent"
  | "faroFull";

const BASE = "/brand/illustrations";

export const ILLUSTRATIONS: Record<
  IllustrationId,
  { src: string; altKey: string; width: number; height: number }
> = {
  heroHarbour: {
    src: `${BASE}/hero-harbour.jpg`,
    altKey: "illustrations.heroHarbour",
    width: 1600,
    height: 900,
  },
  stepAnswer: {
    src: `${BASE}/step-answer.jpg`,
    altKey: "illustrations.stepAnswer",
    width: 800,
    height: 800,
  },
  stepStrategy: {
    src: `${BASE}/step-strategy.jpg`,
    altKey: "illustrations.stepStrategy",
    width: 800,
    height: 800,
  },
  stepHandoff: {
    src: `${BASE}/step-handoff.jpg`,
    altKey: "illustrations.stepHandoff",
    width: 800,
    height: 800,
  },
  emptyHarbour: {
    src: `${BASE}/empty-harbour.jpg`,
    altKey: "illustrations.emptyHarbour",
    width: 1200,
    height: 900,
  },
  startInterview: {
    src: `${BASE}/start-interview.jpg`,
    altKey: "illustrations.startInterview",
    width: 1200,
    height: 900,
  },
  settingsKeys: {
    src: `${BASE}/settings-keys.jpg`,
    altKey: "illustrations.settingsKeys",
    width: 1200,
    height: 900,
  },
  stageStrategy: {
    src: `${BASE}/stage-strategy.jpg`,
    altKey: "illustrations.stageStrategy",
    width: 800,
    height: 800,
  },
  stageName: {
    src: `${BASE}/stage-name.jpg`,
    altKey: "illustrations.stageName",
    width: 800,
    height: 800,
  },
  stageLogo: {
    src: `${BASE}/stage-logo.jpg`,
    altKey: "illustrations.stageLogo",
    width: 800,
    height: 800,
  },
  stageDesign: {
    src: `${BASE}/stage-design.jpg`,
    altKey: "illustrations.stageDesign",
    width: 800,
    height: 800,
  },
  stageHandover: {
    src: `${BASE}/stage-handover.jpg`,
    altKey: "illustrations.stageHandover",
    width: 800,
    height: 800,
  },
  stageContent: {
    src: `${BASE}/stage-content.jpg`,
    altKey: "illustrations.stageContent",
    width: 800,
    height: 800,
  },
  faroFull: {
    src: `${BASE}/faro-full.jpg`,
    altKey: "illustrations.faroFull",
    width: 900,
    height: 1200,
  },
};

/** Six-stage journey id → illustration */
export const STAGE_ILLUSTRATIONS: Record<string, IllustrationId> = {
  strategy: "stageStrategy",
  name: "stageName",
  logo: "stageLogo",
  design: "stageDesign",
  handover: "stageHandover",
  content: "stageContent",
};

export function stageIllustrationId(stageId: string): IllustrationId | null {
  return STAGE_ILLUSTRATIONS[stageId] ?? null;
}

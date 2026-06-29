import { methodology, getSection, type Phase, type Pillar, type Section } from "@/lib/methodology";

// The guided journey is the methodology flattened into a single ordered list of
// sections (phase order → pillar order → section order). Everything about "where
// am I / what's next / what's locked" derives from this order + the saved statuses.

export type FlowStep = {
  sectionId: string;
  index: number; // 0-based position in the whole journey
  phaseId: string;
  pillarId: string;
};

const flow: FlowStep[] = [];
for (const phase of methodology.phases) {
  for (const pillar of phase.pillars) {
    for (const section of pillar.sections) {
      // Internal sections (e.g. the old strategist viability gate) aren't part of
      // the business owner's journey — skip them everywhere flow drives the UI.
      if (section.internal) continue;
      flow.push({
        sectionId: section.id,
        index: flow.length,
        phaseId: phase.id,
        pillarId: pillar.id,
      });
    }
  }
}

const stepByKey = new Map(flow.map((s) => [s.sectionId, s]));

export function flowSteps(): FlowStep[] {
  return flow;
}

export function totalSteps(): number {
  return flow.length;
}

export function stepOf(sectionId: string): FlowStep | undefined {
  return stepByKey.get(sectionId);
}

export function nextSectionId(sectionId: string): string | null {
  const s = stepByKey.get(sectionId);
  if (!s) return null;
  return flow[s.index + 1]?.sectionId ?? null;
}

export function prevSectionId(sectionId: string): string | null {
  const s = stepByKey.get(sectionId);
  if (!s) return null;
  return flow[s.index - 1]?.sectionId ?? null;
}

// Position of a section within its own phase, e.g. {pos: 1, total: 14}.
export function phasePosition(sectionId: string): { pos: number; total: number } {
  const step = stepByKey.get(sectionId);
  if (!step) return { pos: 0, total: 0 };
  const inPhase = flow.filter((s) => s.phaseId === step.phaseId);
  return { pos: inPhase.findIndex((s) => s.sectionId === sectionId) + 1, total: inPhase.length };
}

// ---- Status-derived helpers (take a map of section_key -> status) ----

export type StatusMap = Map<string, string>;

function isComplete(map: StatusMap, sectionId: string): boolean {
  return map.get(sectionId) === "complete";
}

// Required = counts toward finishing a phase / the journey. Optional sections
// (Image survey, the whole design phase, byproducts) are reachable and useful
// but never block progress.
function isRequired(sectionId: string): boolean {
  return !getSection(sectionId)?.optional;
}

// A phase is "done" when every REQUIRED section in it is complete.
export function phaseDone(phaseId: string, map: StatusMap): boolean {
  return flow
    .filter((s) => s.phaseId === phaseId && isRequired(s.sectionId))
    .every((s) => isComplete(map, s.sectionId));
}

// Progress counts required sections only, so 100% lines up with "phase done".
export function phaseProgress(phaseId: string, map: StatusMap): { done: number; total: number } {
  const req = flow.filter((s) => s.phaseId === phaseId && isRequired(s.sectionId));
  return { done: req.filter((s) => isComplete(map, s.sectionId)).length, total: req.length };
}

export function overallProgress(map: StatusMap): { done: number; total: number } {
  const req = flow.filter((s) => isRequired(s.sectionId));
  return { done: req.filter((s) => isComplete(map, s.sectionId)).length, total: req.length };
}

// No hard locks — the owner can work any step in any order, and "Improve with AI"
// works everywhere. Order is guidance (Up next + "builds on" hints), not a gate.
export function phaseUnlocked(_phaseId: string, _map: StatusMap): boolean {
  return true;
}

export type Lock = { locked: boolean; reason?: string };

export function sectionLock(_sectionId: string, _map: StatusMap): Lock {
  return { locked: false };
}

// The single "do this now" step: earliest incomplete REQUIRED section.
// Null means everything required is complete (ready to hand off).
export function upNext(map: StatusMap): string | null {
  const next = flow.find((s) => isRequired(s.sectionId) && !isComplete(map, s.sectionId));
  return next?.sectionId ?? null;
}

export function currentPhaseId(map: StatusMap): string {
  const next = upNext(map);
  if (next) return stepByKey.get(next)!.phaseId;
  return methodology.phases[methodology.phases.length - 1].id;
}

// ---- Grouped review: the owner's whole journey is just FOUR screens. Each bundles
// the essential, designer-relevant steps; operational facts (pricing, channels,
// existing assets) are captured by the intake and flow into the hand-off doc, but
// aren't walked through here. The Design phase is the designer's downstream job.

export type ReviewGroup = { id: string; name: string; blurb: string; sectionIds: string[] };

const reviewGroupList: ReviewGroup[] = [
  {
    id: "foundation",
    name: "You & your business",
    blurb: "What you do, who it's for, and what you stand for — drafted from your answers. Skim and fix anything off.",
    sectionIds: [
      "reality.problem",
      "reality.solution",
      "reality.value-proposition",
      "reality.differentiator",
      "reality.ideal-client",
      "identity.origin",
      "identity.self-perception",
      "identity.beliefs",
      "identity.principle",
      "identity.golden-circle",
    ],
  },
  {
    id: "customers",
    name: "What your customers think",
    blurb: "How people actually see you, next to how you see yourself — the gap that makes the brief specific. Run the short survey, or skip for now.",
    sectionIds: [
      "image.survey-design",
      "image.results",
      "image.pattern-analysis",
      "image.contrast",
      "image.key-finding",
    ],
  },
  {
    id: "voice",
    name: "Your brand's voice",
    blurb: "How the brand should sound and behave — purpose, values, personality, tone, promise.",
    sectionIds: [
      "communication.purpose",
      "communication.values",
      "communication.personality",
      "communication.tone",
      "communication.promise",
    ],
  },
  {
    id: "brief",
    name: "Your brief & concept",
    blurb: "The payoff: the one-page strategic brief, the guiding concept, the manifesto, and the design plan your designer builds from.",
    sectionIds: [
      "brief.central-pattern",
      "brief.main-tension",
      "brief.constraint",
      "brief.emotional-territory",
      "brief.must-resolve",
      "concept",
      "manifesto",
      "design-plan",
    ],
  },
];

export function reviewGroups(): ReviewGroup[] {
  return reviewGroupList;
}

export function getReviewGroup(id: string): ReviewGroup | undefined {
  return reviewGroupList.find((g) => g.id === id);
}

export function reviewGroupPosition(id: string): { pos: number; total: number } {
  return { pos: reviewGroupList.findIndex((g) => g.id === id) + 1, total: reviewGroupList.length };
}

export function nextReviewGroupId(id: string): string | null {
  const i = reviewGroupList.findIndex((g) => g.id === id);
  return i >= 0 ? reviewGroupList[i + 1]?.id ?? null : null;
}

// A step is "settled" if it's complete, or it's optional and untouched (e.g. a
// skipped survey). Optional-but-drafted steps still want a glance.
function sectionSettled(map: StatusMap, id: string): boolean {
  if (isComplete(map, id)) return true;
  return !isRequired(id) && (map.get(id) ?? "empty") === "empty";
}

export function reviewGroupDone(id: string, map: StatusMap): boolean {
  const g = getReviewGroup(id);
  return g ? g.sectionIds.every((sid) => sectionSettled(map, sid)) : false;
}

export function reviewGroupProgress(id: string, map: StatusMap): { done: number; total: number } {
  const g = getReviewGroup(id);
  if (!g) return { done: 0, total: 0 };
  return { done: g.sectionIds.filter((sid) => sectionSettled(map, sid)).length, total: g.sectionIds.length };
}

// The group to work next (first not-done), or null when the whole review is done.
export function firstIncompleteReviewGroup(map: StatusMap): string | null {
  return reviewGroupList.find((g) => !reviewGroupDone(g.id, map))?.id ?? null;
}

export function currentReviewGroupId(map: StatusMap): string {
  return firstIncompleteReviewGroup(map) ?? reviewGroupList[reviewGroupList.length - 1].id;
}

export function reviewProgress(map: StatusMap): { done: number; total: number } {
  const all = reviewGroupList.flatMap((g) => g.sectionIds);
  return { done: all.filter((sid) => sectionSettled(map, sid)).length, total: all.length };
}

export type { Phase, Pillar, Section };

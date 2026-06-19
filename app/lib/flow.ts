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

// "Filled" = has at least draft content (used for dependency gating).
function isFilled(map: StatusMap, sectionId: string): boolean {
  const s = map.get(sectionId);
  return s != null && s !== "empty";
}

// A phase is "done" when every section in it is complete.
export function phaseDone(phaseId: string, map: StatusMap): boolean {
  return flow.filter((s) => s.phaseId === phaseId).every((s) => isComplete(map, s.sectionId));
}

export function phaseProgress(phaseId: string, map: StatusMap): { done: number; total: number } {
  const inPhase = flow.filter((s) => s.phaseId === phaseId);
  return { done: inPhase.filter((s) => isComplete(map, s.sectionId)).length, total: inPhase.length };
}

export function overallProgress(map: StatusMap): { done: number; total: number } {
  return { done: flow.filter((s) => isComplete(map, s.sectionId)).length, total: flow.length };
}

// A phase unlocks once all earlier phases are done.
export function phaseUnlocked(phaseId: string, map: StatusMap): boolean {
  for (const phase of methodology.phases) {
    if (phase.id === phaseId) return true;
    if (!phaseDone(phase.id, map)) return false;
  }
  return true;
}

export type Lock = { locked: boolean; reason?: string };

// Why (if at all) a section can't be worked on yet.
export function sectionLock(sectionId: string, map: StatusMap): Lock {
  const step = stepByKey.get(sectionId);
  const section = getSection(sectionId);
  if (!step || !section) return { locked: false };

  if (!phaseUnlocked(step.phaseId, map)) {
    const prev = earlierUnfinishedPhase(step.phaseId, map);
    return { locked: true, reason: prev ? `Finish the ${prev.name} phase first` : "Locked" };
  }

  // Synthesis sections need their upstream inputs before they can be drafted.
  if ((section.kind === "synthesis" || section.kind === "partial") && section.reads?.length) {
    const missing = section.reads.filter((r) => !isFilled(map, r));
    if (missing.length) {
      const names = missing.map((id) => getSection(id)?.name ?? id);
      return { locked: true, reason: `Add ${names.join(", ")} first` };
    }
  }
  return { locked: false };
}

function earlierUnfinishedPhase(phaseId: string, map: StatusMap): Phase | undefined {
  for (const phase of methodology.phases) {
    if (phase.id === phaseId) return undefined;
    if (!phaseDone(phase.id, map)) return phase;
  }
  return undefined;
}

// The single "do this now" step: earliest incomplete section that isn't locked.
// If every incomplete step is locked, returns the earliest incomplete one anyway
// (so the user can see what's blocking). Null means the whole journey is complete.
export function upNext(map: StatusMap): string | null {
  const incomplete = flow.filter((s) => !isComplete(map, s.sectionId));
  if (incomplete.length === 0) return null;
  const actionable = incomplete.find((s) => !sectionLock(s.sectionId, map).locked);
  return (actionable ?? incomplete[0]).sectionId;
}

export function currentPhaseId(map: StatusMap): string {
  const next = upNext(map);
  if (next) return stepByKey.get(next)!.phaseId;
  return methodology.phases[methodology.phases.length - 1].id;
}

export type { Phase, Pillar, Section };

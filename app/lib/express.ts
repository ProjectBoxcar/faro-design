import "server-only";
import { flowSteps } from "@/lib/flow";
import { allSections, getSection } from "@/lib/methodology";
import { getSections, saveSection, filledKeys } from "@/lib/queries";
import { generateSection } from "@/lib/generate";
import { canGenerate } from "@/lib/methodology";
import type { SectionValue } from "@/lib/db/types";
import { maybeRunViabilityGate } from "@/lib/viability";
import { classifyAiFailure, formatClassifiedFailure } from "@/lib/ai-failure";

// The express journey: after the Quick Start interview seeds the owner's
// facts, one background pipeline drafts the ENTIRE required strategy chain in
// dependency order — Reality synthesis → Identity → Communication → Strategic
// Document → Strategic Brief → Concept → Manifesto → Audit → Design Plan — so
// the owner reviews a single finished brief + design plan instead of walking
// dozens of steps. Drafts stay editable and are only committed when the owner
// approves the review screen.

export type ExpressState = {
  status: "idle" | "running" | "done" | "failed" | "cancelled";
  done: number;
  total: number;
  current: string | null; // section id being drafted
  currentName: string | null;
  error: string | null;
  /** Owner can call start again; filled sections are skipped (same strategy engine). */
  resumable?: boolean;
  /** Failure taxonomy — strategy lane only */
  errorCode?: string | null;
  errorHint?: string | null;
  /** Always strategy-direct for this pipeline */
  engine?: "strategy-direct";
};

// After the owner marks a review card Ready, cascade-regenerate every
// downstream synthesis step that reads (directly or transitively) from it.
export type RefineState = {
  status: "idle" | "running" | "done" | "failed" | "cancelled";
  sourceId: string | null;
  sourceName: string | null;
  done: number;
  total: number;
  current: string | null;
  currentName: string | null;
  error: string | null;
  updatedIds: string[];
  errorCode?: string | null;
  errorHint?: string | null;
};

class GenerationCancelled extends Error {
  constructor(message = "Generation stopped.") {
    super(message);
    this.name = "GenerationCancelled";
  }
}

// Required synthesis/partial sections in journey order — the generation chain.
export function expressSectionIds(): string[] {
  return flowSteps()
    .map((s) => getSection(s.sectionId))
    .filter(
      (s): s is NonNullable<typeof s> =>
        Boolean(s) && !s!.optional && (s!.kind === "synthesis" || s!.kind === "partial")
    )
    .map((s) => s.id);
}

/** Required Reality/Identity owner-input sections (must exist before synthesis). */
export function requiredOwnerInputIds(): string[] {
  return flowSteps()
    .map((s) => getSection(s.sectionId))
    .filter(
      (s): s is NonNullable<typeof s> =>
        Boolean(s) &&
        !s!.optional &&
        s!.kind === "input" &&
        (s!.id.startsWith("reality.") || s!.id.startsWith("identity."))
    )
    .map((s) => s.id);
}

const runs = new Map<
  string,
  { state: ExpressState; promise: Promise<void>; cancelled: boolean }
>();
const refines = new Map<
  string,
  { state: RefineState; promise: Promise<void>; cancelled: boolean }
>();

function throwIfExpressCancelled(projectId: string) {
  const run = runs.get(projectId);
  if (run?.cancelled) throw new GenerationCancelled();
}

function throwIfRefineCancelled(projectId: string) {
  const run = refines.get(projectId);
  if (run?.cancelled) throw new GenerationCancelled();
}

// Provider rate limits (429) pause the pipeline briefly instead of failing it.
async function generateWithRetry(
  projectId: string,
  id: string,
  checkCancel?: () => void
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    checkCancel?.();
    try {
      return await generateSection(projectId, id, {});
    } catch (error) {
      if (error instanceof GenerationCancelled) throw error;
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      if (!/429|rate limit|overloaded/i.test(message)) throw error;
      await new Promise((r) => setTimeout(r, 20_000 * (attempt + 1)));
    }
  }
  throw lastError;
}

/** Stop an in-flight strategy draft. Completes after the current section finishes. */
export function cancelExpress(projectId: string): ExpressState {
  const existing = runs.get(projectId);
  if (existing && existing.state.status === "running") {
    existing.cancelled = true;
    existing.state.status = "cancelled";
    existing.state.current = null;
    existing.state.currentName = null;
    existing.state.error = null;
    return existing.state;
  }
  // Idle / no in-memory run (e.g. between polls): still surface as stopped so the
  // owner isn't auto-restarted by the client.
  const snapshot = expressStatus(projectId);
  if (snapshot.status === "done" || snapshot.status === "failed") return snapshot;
  if (snapshot.status === "cancelled") return snapshot;
  const state: ExpressState = {
    ...snapshot,
    status: "cancelled",
    current: null,
    currentName: null,
    error: null,
  };
  runs.set(projectId, { state, promise: Promise.resolve(), cancelled: true });
  return state;
}

/** Stop an in-flight Ready cascade. Completes after the current card finishes. */
export function cancelExpressRefine(projectId: string): RefineState {
  const existing = refines.get(projectId);
  if (!existing || existing.state.status !== "running") {
    return refineStatus(projectId);
  }
  existing.cancelled = true;
  existing.state.status = "cancelled";
  existing.state.current = null;
  existing.state.currentName = null;
  existing.state.error = null;
  return existing.state;
}

export function expressStatus(projectId: string): ExpressState {
  const active = runs.get(projectId);
  if (active) {
    return {
      ...active.state,
      engine: "strategy-direct",
      resumable:
        active.state.status === "failed" ||
        active.state.status === "cancelled" ||
        (active.state.status === "running" && active.state.done > 0),
    };
  }
  // No in-memory run (e.g. after a server restart): derive from saved statuses.
  // Partial progress → idle + resumable (startExpress skips filled sections).
  const ids = expressSectionIds();
  const statusOf = new Map(getSections(projectId).map((r) => [r.section_key, r.status]));
  const done = ids.filter((id) => (statusOf.get(id) ?? "empty") !== "empty").length;
  const complete = done === ids.length && ids.length > 0;
  return {
    status: complete ? "done" : "idle",
    done,
    total: ids.length,
    current: null,
    currentName: null,
    error: null,
    engine: "strategy-direct",
    resumable: !complete && done > 0,
  };
}

export function refineStatus(projectId: string): RefineState {
  const active = refines.get(projectId);
  if (active) return active.state;
  return {
    status: "idle",
    sourceId: null,
    sourceName: null,
    done: 0,
    total: 0,
    current: null,
    currentName: null,
    error: null,
    updatedIds: [],
  };
}

// Sections in the express generation chain that depend (transitively) on `rootId`.
// Order matches expressSectionIds so cascade regen stays dependency-safe.
export function expressDependents(rootId: string): string[] {
  const reverse = new Map<string, string[]>();
  for (const section of allSections()) {
    for (const read of section.reads ?? []) {
      const list = reverse.get(read) ?? [];
      list.push(section.id);
      reverse.set(read, list);
    }
  }
  const reachable = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const child of reverse.get(id) ?? []) {
      if (reachable.has(child)) continue;
      reachable.add(child);
      queue.push(child);
    }
  }
  return expressSectionIds().filter((id) => id !== rootId && reachable.has(id));
}

// Start (or resume) the pipeline. Idempotent: already-filled sections are
// skipped, so a restart continues where the last run stopped (strategy engine only).
export function startExpress(projectId: string): ExpressState {
  const existing = runs.get(projectId);
  if (existing && existing.state.status === "running") return existing.state;

  const ids = expressSectionIds();
  const alreadyDone = ids.filter((id) => filledKeys(projectId).has(id)).length;
  const state: ExpressState = {
    status: "running",
    done: alreadyDone,
    total: ids.length,
    current: null,
    currentName: null,
    error: null,
    errorCode: null,
    errorHint: null,
    engine: "strategy-direct",
    resumable: alreadyDone > 0,
  };

  const entry = { state, promise: Promise.resolve(), cancelled: false };
  runs.set(projectId, entry);

  const promise = (async () => {
    // 0) Guarantee every required Reality/Identity input exists before synthesis.
    // Quick Start should have filled these; if any are still empty, draft them
    // from the owner's words already on file so the journey never stalls.
    const ownerInputs = requiredOwnerInputIds();
    for (const id of ownerInputs) {
      throwIfExpressCancelled(projectId);
      if (filledKeys(projectId).has(id)) continue;
      state.current = id;
      state.currentName = getSection(id)?.name ?? id;
      try {
        const result = await generateWithRetry(projectId, id, () =>
          throwIfExpressCancelled(projectId)
        );
        saveSection({
          projectId,
          key: id,
          value: result.values as unknown as SectionValue,
          status: "draft",
          aiGenerated: true,
        });
      } catch (e) {
        console.warn(`[express] could not backfill owner input ${id}:`, e);
      }
    }

    // The journey listing is not strictly topological (a section may read a
    // sibling listed after it), so run passes: each pass drafts every section
    // whose inputs exist, until all are done or a pass makes no progress.
    let remaining = ids;
    while (remaining.length > 0) {
      throwIfExpressCancelled(projectId);
      const next: string[] = [];
      let progressed = false;
      for (const id of remaining) {
        throwIfExpressCancelled(projectId);
        const filled = filledKeys(projectId);
        if (filled.has(id)) {
          // Already counted in alreadyDone / prior passes — keep done in sync with disk.
          state.done = ids.filter((sid) => filledKeys(projectId).has(sid)).length;
          progressed = true;
          continue;
        }
        if (!canGenerate(id, filled)) {
          next.push(id);
          continue;
        }
        state.current = id;
        state.currentName = getSection(id)?.name ?? id;
        const result = await generateWithRetry(projectId, id, () =>
          throwIfExpressCancelled(projectId)
        );
        throwIfExpressCancelled(projectId);
        saveSection({
          projectId,
          key: id,
          value: result.values as unknown as SectionValue,
          status: "draft",
          aiGenerated: true,
        });
        state.done = ids.filter((sid) => filledKeys(projectId).has(sid)).length;
        progressed = true;
      }
      if (!progressed) {
        throwIfExpressCancelled(projectId);
        const names = next.map((id) => getSection(id)?.name ?? id).join(", ");
        throw new Error(`Some steps are missing their inputs — ${names}. Fill the Quick Start answers first.`);
      }
      remaining = next;
    }
    state.current = null;
    state.currentName = null;
    state.status = "done";
    state.resumable = false;
    state.errorCode = null;
    state.errorHint = null;
    // Mark every drafted strategy step complete so the journey track (and
    // handover path) shows full completion after the first-questions pipeline.
    try {
      const { completeSectionsWithContent } = await import("@/lib/queries");
      const { flowSteps } = await import("@/lib/flow");
      completeSectionsWithContent(
        projectId,
        flowSteps().map((s) => s.sectionId)
      );
      // Also complete every Reality/Identity input that was drafted.
      completeSectionsWithContent(projectId, requiredOwnerInputIds());
    } catch (e) {
      console.warn("[express] complete-sections pass failed:", e);
    }
    // The strategy is drafted — evaluate viability in the background so the
    // verdict is ready by the time the owner approves and opens the Studio.
    void maybeRunViabilityGate(projectId).catch((e) => console.error("[viability] failed:", e));
  })().catch((error) => {
    if (error instanceof GenerationCancelled || entry.cancelled) {
      const c = classifyAiFailure(error, "strategy");
      state.status = "cancelled";
      state.current = null;
      state.currentName = null;
      state.error = null;
      state.errorCode = c.code;
      state.errorHint = c.hint;
      state.resumable = true;
      state.done = ids.filter((sid) => filledKeys(projectId).has(sid)).length;
      return;
    }
    const c = classifyAiFailure(error, "strategy");
    state.status = "failed";
    state.current = null;
    state.currentName = null;
    state.error = formatClassifiedFailure(c);
    state.errorCode = c.code;
    state.errorHint = c.hint;
    state.resumable = true;
    state.done = ids.filter((sid) => filledKeys(projectId).has(sid)).length;
  });

  entry.promise = promise;
  return state;
}

// Owner finished editing a review card: persist their wording, then rewrite
// every downstream AI draft that builds on it — keeping the express page open.
export function startExpressRefine(
  projectId: string,
  sectionId: string,
  value: Record<string, unknown>
): RefineState {
  const existing = refines.get(projectId);
  if (existing && existing.state.status === "running") return existing.state;

  const section = getSection(sectionId);
  if (!section) {
    return {
      status: "failed",
      sourceId: sectionId,
      sourceName: sectionId,
      done: 0,
      total: 0,
      current: null,
      currentName: null,
      error: `Unknown section: ${sectionId}`,
      updatedIds: [],
    };
  }

  // Manual ownership of the edited card — cascade steps stay AI-authored.
  saveSection({
    projectId,
    key: sectionId,
    value: value as unknown as SectionValue,
    status: "draft",
    aiGenerated: false,
  });

  const dependents = expressDependents(sectionId);
  const state: RefineState = {
    status: dependents.length === 0 ? "done" : "running",
    sourceId: sectionId,
    sourceName: section.name,
    done: 0,
    total: dependents.length,
    current: null,
    currentName: null,
    error: null,
    updatedIds: [sectionId],
  };

  if (dependents.length === 0) {
    refines.set(projectId, { state, promise: Promise.resolve(), cancelled: false });
    return state;
  }

  const entry = { state, promise: Promise.resolve(), cancelled: false };
  refines.set(projectId, entry);

  const promise = (async () => {
    for (const id of dependents) {
      throwIfRefineCancelled(projectId);
      const filled = filledKeys(projectId);
      // Dependents should almost always be generatable after the edit; if a hard
      // dep is missing, skip rather than hard-failing the whole cascade.
      if (!canGenerate(id, filled) && !filled.has(id)) {
        state.done += 1;
        continue;
      }
      state.current = id;
      state.currentName = getSection(id)?.name ?? id;
      const result = await generateWithRetry(projectId, id, () =>
        throwIfRefineCancelled(projectId)
      );
      throwIfRefineCancelled(projectId);
      saveSection({
        projectId,
        key: id,
        value: result.values as unknown as SectionValue,
        status: "draft",
        aiGenerated: true,
      });
      state.updatedIds.push(id);
      state.done += 1;
    }
    state.current = null;
    state.currentName = null;
    state.status = "done";
    void maybeRunViabilityGate(projectId).catch((e) => console.error("[viability] failed:", e));
  })().catch((error) => {
    if (error instanceof GenerationCancelled || entry.cancelled) {
      const c = classifyAiFailure(error, "strategy");
      state.status = "cancelled";
      state.current = null;
      state.currentName = null;
      state.error = null;
      state.errorCode = c.code;
      state.errorHint = c.hint;
      return;
    }
    const c = classifyAiFailure(error, "strategy");
    state.status = "failed";
    state.current = null;
    state.currentName = null;
    state.error = formatClassifiedFailure(c);
    state.errorCode = c.code;
    state.errorHint = c.hint;
  });

  entry.promise = promise;
  return state;
}

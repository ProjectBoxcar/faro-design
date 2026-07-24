import "server-only";
import { flowSteps } from "@/lib/flow";
import { getSection } from "@/lib/methodology";
import { getSections, saveSection, filledKeys } from "@/lib/queries";
import { generateSection } from "@/lib/generate";
import { canGenerate } from "@/lib/methodology";
import type { SectionValue } from "@/lib/db/types";
import { maybeRunViabilityGate } from "@/lib/viability";

// The express journey: after the Quick Start interview seeds the owner's
// facts, one background pipeline drafts the ENTIRE required strategy chain in
// dependency order — Reality synthesis → Identity → Communication → Strategic
// Document → Strategic Brief → Concept → Manifesto → Audit → Design Plan — so
// the owner reviews a single finished brief + design plan instead of walking
// dozens of steps. Drafts stay editable and are only committed when the owner
// approves the review screen.

export type ExpressState = {
  status: "idle" | "running" | "done" | "failed";
  done: number;
  total: number;
  current: string | null; // section id being drafted
  currentName: string | null;
  error: string | null;
};

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

const runs = new Map<string, { state: ExpressState; promise: Promise<void> }>();

// Provider rate limits (429) pause the pipeline briefly instead of failing it.
async function generateWithRetry(projectId: string, id: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await generateSection(projectId, id, {});
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      if (!/429|rate limit|overloaded/i.test(message)) throw error;
      await new Promise((r) => setTimeout(r, 20_000 * (attempt + 1)));
    }
  }
  throw lastError;
}

export function expressStatus(projectId: string): ExpressState {
  const active = runs.get(projectId);
  if (active) return active.state;
  // No in-memory run (e.g. after a server restart): derive from saved statuses.
  const ids = expressSectionIds();
  const statusOf = new Map(getSections(projectId).map((r) => [r.section_key, r.status]));
  const done = ids.filter((id) => (statusOf.get(id) ?? "empty") !== "empty").length;
  return {
    status: done === ids.length ? "done" : "idle",
    done,
    total: ids.length,
    current: null,
    currentName: null,
    error: null,
  };
}

// Start (or resume) the pipeline. Idempotent: already-filled sections are
// skipped, so a restart continues where the last run stopped.
export function startExpress(projectId: string): ExpressState {
  const existing = runs.get(projectId);
  if (existing && existing.state.status === "running") return existing.state;

  const ids = expressSectionIds();
  const state: ExpressState = {
    status: "running",
    done: 0,
    total: ids.length,
    current: null,
    currentName: null,
    error: null,
  };

  const promise = (async () => {
    // The journey listing is not strictly topological (a section may read a
    // sibling listed after it), so run passes: each pass drafts every section
    // whose inputs exist, until all are done or a pass makes no progress.
    let remaining = ids;
    while (remaining.length > 0) {
      const next: string[] = [];
      let progressed = false;
      for (const id of remaining) {
        const filled = filledKeys(projectId);
        if (filled.has(id)) {
          state.done += 1;
          progressed = true;
          continue;
        }
        if (!canGenerate(id, filled)) {
          next.push(id);
          continue;
        }
        state.current = id;
        state.currentName = getSection(id)?.name ?? id;
        const result = await generateWithRetry(projectId, id);
        saveSection({
          projectId,
          key: id,
          value: result.values as unknown as SectionValue,
          status: "draft",
          aiGenerated: true,
        });
        state.done += 1;
        progressed = true;
      }
      if (!progressed) {
        const names = next.map((id) => getSection(id)?.name ?? id).join(", ");
        throw new Error(`Some steps are missing their inputs — ${names}. Fill the Quick Start answers first.`);
      }
      remaining = next;
    }
    state.current = null;
    state.currentName = null;
    state.status = "done";
    // The strategy is drafted — evaluate viability in the background so the
    // verdict is ready by the time the owner approves and opens the Studio.
    void maybeRunViabilityGate(projectId).catch((e) => console.error("[viability] failed:", e));
  })().catch((error) => {
    state.status = "failed";
    state.current = null;
    state.currentName = null;
    state.error = error instanceof Error ? error.message : "Strategy drafting failed";
  });

  runs.set(projectId, { state, promise });
  return state;
}

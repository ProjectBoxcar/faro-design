"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Loader2, Square } from "lucide-react";
import { FaroBeacon } from "@/components/FaroLoader";
import { countBasedPercent, timeBasedPercent } from "@/lib/generation-progress";

export type DesignGenerationKind =
  | "design_system"
  | "landing_page"
  | "deck"
  | "mockups"
  | "channels";

const GENERATION_COPY: Record<
  DesignGenerationKind,
  { title: string; output: string; focuses: string[] }
> = {
  design_system: {
    title: "Building your brand identity",
    output: "identity systems",
    focuses: [
      "Reading across Reality, Identity, and Communication",
      "Finding the central pattern running through the strategy",
      "Mapping the emotional territory the brand should occupy",
      "Translating strategic constraints into visual decisions",
      "Testing logo behavior at large and small sizes",
      "Giving every color and type choice a clear role",
      "Keeping components consistent with the identity",
      "Making each direction genuinely distinct",
    ],
  },
  landing_page: {
    title: "Building your landing page directions",
    output: "landing pages",
    focuses: [
      "Carrying the final identity into the page experience",
      "Turning the value proposition into a clear opening message",
      "Sequencing the problem, solution, and proof into one story",
      "Giving calls to action the right emphasis",
      "Applying color and type roles consistently",
      "Shaping responsive behavior for smaller screens",
      "Balancing movement with clarity and accessibility",
      "Making each direction genuinely distinct",
    ],
  },
  mockups: {
    title: "Applying your identity to the mockups",
    output: "application mockups",
    focuses: [
      "Reading the design plan's execution order",
      "Carrying the approved identity into a landing page",
      "Turning the value proposition into a clear opening message",
      "Building the brand deck from the strategy narrative",
      "Applying color and type roles consistently",
      "Keeping every application true to the chosen system",
      "Shaping responsive behavior for smaller screens",
      "Balancing movement with clarity and accessibility",
    ],
  },
  deck: {
    title: "Building your brand deck directions",
    output: "brand decks",
    focuses: [
      "Turning the brief into a clear presentation narrative",
      "Giving each slide one primary message",
      "Connecting strategy, concept, and visual direction",
      "Balancing evidence with emotional impact",
      "Applying the final identity across every slide",
      "Testing hierarchy at presentation scale",
      "Making the story work with keyboard and touch navigation",
      "Making each direction genuinely distinct",
    ],
  },
  channels: {
    title: "Building channel templates",
    output: "SMS, email, ad, and print mockups",
    focuses: [
      "Carrying the approved identity into SMS",
      "Drafting an email layout from the strategy brief",
      "Shaping feed and story ad canvases",
      "Laying out print card and flyer applications",
      "Keeping every channel true to the chosen system",
      "Using only brief-backed claims and copy",
      "Embedding the approved logo consistently",
      "Keeping every file fully offline",
    ],
  },
};

const DIRECTIONS = [
  { variant: "A", title: "Editorial restraint", detail: "Premium, calm, spacious" },
  { variant: "B", title: "Warm connection", detail: "Human, tactile, approachable" },
  { variant: "C", title: "Bold contrast", detail: "Contemporary, sharp, confident" },
];

/** Typical full-round duration (seconds) used only for soft estimates when no asset progress yet. */
const ESTIMATE_SECONDS: Record<DesignGenerationKind, number> = {
  design_system: 180,
  landing_page: 150,
  deck: 150,
  mockups: 200,
  channels: 280,
};

export function formatGenerationElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder.toString().padStart(2, "0")}s` : `${remainder}s`;
}

export function generationFocusIndex(seconds: number, count: number): number {
  return count > 0 ? Math.floor(seconds / 12) % count : 0;
}

/**
 * Progress percent for design generation.
 * Uses real done/total when known. Soft-fills only the *current* open unit using
 * seconds since the last completion — never a wall-clock modulo (that caused
 * the bar to jump backward from ~80% toward 0%).
 */
export function generationProgressPercent(
  elapsedSeconds: number,
  kind: DesignGenerationKind,
  done = 0,
  total = 0,
  /** Seconds spent on the current unfinished unit (since done last increased). */
  secondsInCurrent?: number
): number {
  if (total > 0 && done >= total) return 100;
  if (total > 0) {
    const perUnit = ESTIMATE_SECONDS[kind] / Math.max(total, 1);
    // Prefer explicit "time in current unit"; fall back to a safe estimate that
    // does NOT use modulo on total elapsed (modulo sawtooths).
    const inCurrent =
      typeof secondsInCurrent === "number"
        ? secondsInCurrent
        : Math.min(elapsedSeconds, perUnit * 0.95);
    return countBasedPercent({
      done,
      total,
      secondsInCurrent: inCurrent,
      secondsPerUnit: perUnit,
    });
  }
  return timeBasedPercent(elapsedSeconds, ESTIMATE_SECONDS[kind]);
}

export function DesignGenerationWindow({
  kind,
  projectName,
  onCancel,
  cancelling = false,
  progressDone = 0,
  progressTotal = 0,
}: {
  kind: DesignGenerationKind;
  projectName: string;
  onCancel?: () => void;
  cancelling?: boolean;
  /** Completed proposals/assets in this job (when known). */
  progressDone?: number;
  /** Expected proposals/assets in this job (when known). */
  progressTotal?: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [peakPct, setPeakPct] = useState(1);
  const lastDoneRef = useRef(progressDone);
  const unitStartedAtRef = useRef(Date.now());
  const [secondsInCurrent, setSecondsInCurrent] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    unitStartedAtRef.current = startedAt;
    lastDoneRef.current = progressDone;
    setPeakPct(1);
    const update = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - startedAt) / 1000));
      setSecondsInCurrent(Math.floor((now - unitStartedAtRef.current) / 1000));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
    // Reset timer only when kind changes (new generation kind), not when done ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // When a new proposal finishes, restart soft fill for the *next* unit only —
  // the overall bar stays monotonic via peakPct.
  useEffect(() => {
    if (progressDone !== lastDoneRef.current) {
      lastDoneRef.current = progressDone;
      unitStartedAtRef.current = Date.now();
      setSecondsInCurrent(0);
    }
  }, [progressDone]);

  const copy = GENERATION_COPY[kind];
  const focus = copy.focuses[generationFocusIndex(elapsed, copy.focuses.length)];
  const rawPct = generationProgressPercent(
    elapsed,
    kind,
    progressDone,
    progressTotal,
    secondsInCurrent
  );
  useEffect(() => {
    setPeakPct((prev) => Math.max(prev, rawPct));
  }, [rawPct]);
  const pct = Math.max(peakPct, rawPct);

  return (
    <section
      aria-labelledby="generation-title"
      aria-busy="true"
      className="relative flex min-h-[60vh] flex-1 overflow-hidden rounded-xl bg-[var(--foreground)] px-5 py-8 text-white lg:min-h-[70vh] lg:px-10 lg:py-10"
    >
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Faro is creating{" "}
        {kind === "mockups" || kind === "channels" ? "the" : "three"} {copy.output} for{" "}
        {projectName}. Generation is {pct}% complete. Keep this page open.
      </div>
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[var(--client)]/30 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col justify-between gap-8">
        <div>
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="mb-6 inline-flex items-center justify-center">
                <FaroBeacon size="xl" tone="light" />
              </div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Faro Design Studio
              </p>
              <h2 id="generation-title" className="max-w-2xl font-serif text-2xl font-medium tracking-tight lg:text-3xl">
                {copy.title}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
                {kind === "mockups"
                  ? `A landing page and brand deck for ${projectName}, applying the identity you approved.`
                  : kind === "channels"
                    ? `SMS, email, ad, and print templates for ${projectName}, applying the identity you approved.`
                    : `Three distinct directions for ${projectName}, grounded in the strategy you already shaped.`}
              </p>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/45">
                {kind === "mockups"
                  ? "Landing page first, then brand deck — each applies the identity you approved. Typically a few minutes — keep this tab open."
                  : kind === "channels"
                    ? "Four channel templates, one after another (often several minutes). Progress ticks as each finishes — keep this tab open."
                  : kind === "design_system"
                    ? "Three full identity systems, built one at a time (often 10–15 minutes total). Progress ticks up as each proposal finishes — keep this tab open."
                    : "Directions build one at a time so each stays distinct and grounded in your strategy. Proposals appear as each finishes."}
              </p>
            </div>
            <div className="inline-flex shrink-0 flex-col items-end gap-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/65">
                <Clock3 size={13} aria-hidden="true" />
                <span aria-hidden="true">{formatGenerationElapsed(elapsed)} elapsed</span>
                <span className="sr-only">Generation is still in progress</span>
              </div>
              {elapsed >= 90 && (
                <span className="text-[10px] text-white/40">Still working — keep this tab open</span>
              )}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Generation progress"
            >
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-white" aria-live="polite">
              {pct}%
            </span>
          </div>
          {progressTotal > 0 && (
            <p className="mt-2 text-xs text-white/45">
              {progressDone} of {progressTotal}{" "}
              {kind === "mockups" || kind === "channels" ? "applications" : "directions"} ready
            </p>
          )}
        </div>

        {kind !== "mockups" && kind !== "channels" && (
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Three directions in this round
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {DIRECTIONS.map((direction, index) => {
              const directionDone = progressTotal > 0 && index < progressDone;
              const directionActive =
                progressTotal > 0
                  ? index === progressDone && progressDone < progressTotal
                  : index === Math.min(2, Math.floor((pct / 100) * 3));
              return (
              <div
                key={direction.variant}
                className={`rounded-2xl border p-4 backdrop-blur-sm ${
                  directionDone
                    ? "border-white/25 bg-white/12"
                    : directionActive
                    ? "border-white/20 bg-white/[0.08]"
                    : "border-white/12 bg-white/[0.06]"
                }`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--foreground)]">
                    {direction.variant}
                  </span>
                  {directionDone ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                      Done
                    </span>
                  ) : (
                    <span
                      className="faro-generation-dot h-2 w-2 rounded-full bg-white/60"
                      style={{ animationDelay: `${index * 240}ms` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <p className="text-sm font-semibold">{direction.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{direction.detail}</p>
              </div>
            );
            })}
          </div>
        </div>
        )}

        <div className="flex flex-col gap-5 border-t border-white/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Design lens</p>
            <p key={focus} className="faro-generation-focus mt-2 text-sm leading-relaxed text-white/75" aria-hidden="true">
              {focus}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <p className="max-w-xs text-xs leading-relaxed text-white/45 sm:text-right">
              Real brand work takes a little time. Keep this page open; the proposals will appear here when ready.
            </p>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
              >
                {cancelling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Stopping…
                  </>
                ) : (
                  <>
                    <Square size={12} fill="currentColor" /> Stop generation
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

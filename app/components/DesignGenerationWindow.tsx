"use client";

import { useEffect, useState } from "react";
import { Clock3, Sparkles } from "lucide-react";

export type DesignGenerationKind = "design_system" | "landing_page" | "deck";

const GENERATION_COPY: Record<
  DesignGenerationKind,
  { title: string; output: string; focuses: string[] }
> = {
  design_system: {
    title: "Building your brand identity",
    output: "identity systems",
    focuses: [
      "Reading across Reality, Identity, Image, and Communication",
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
};

const DIRECTIONS = [
  { variant: "A", title: "Editorial restraint", detail: "Premium, calm, spacious" },
  { variant: "B", title: "Warm connection", detail: "Human, tactile, approachable" },
  { variant: "C", title: "Bold contrast", detail: "Contemporary, sharp, confident" },
];

export function formatGenerationElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder.toString().padStart(2, "0")}s` : `${remainder}s`;
}

export function generationFocusIndex(seconds: number, count: number): number {
  return count > 0 ? Math.floor(seconds / 12) % count : 0;
}

export function DesignGenerationWindow({
  kind,
  projectName,
}: {
  kind: DesignGenerationKind;
  projectName: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const update = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [kind]);

  const copy = GENERATION_COPY[kind];
  const focus = copy.focuses[generationFocusIndex(elapsed, copy.focuses.length)];

  return (
    <section
      aria-labelledby="generation-title"
      aria-busy="true"
      className="relative flex min-h-[60vh] flex-1 overflow-hidden rounded-xl bg-[var(--foreground)] px-5 py-8 text-white lg:min-h-[70vh] lg:px-10 lg:py-10"
    >
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Faro is creating three {copy.output} for {projectName}. Generation is in progress. Keep this page open.
      </div>
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[var(--client)]/30 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col justify-between gap-8">
        <div>
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                <Sparkles size={20} aria-hidden="true" className="faro-generation-spark" />
              </div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Faro Design Studio
              </p>
              <h2 id="generation-title" className="max-w-2xl font-serif text-3xl font-medium tracking-tight lg:text-4xl">
                {copy.title}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
                Three distinct directions for {projectName}, grounded in the strategy you already shaped.
              </p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/65">
              <Clock3 size={13} aria-hidden="true" />
              <span aria-hidden="true">{formatGenerationElapsed(elapsed)} elapsed</span>
              <span className="sr-only">Generation is still in progress</span>
            </div>
          </div>

          <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="faro-generation-progress h-full w-2/5 rounded-full bg-white/70" />
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Three directions in this round
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {DIRECTIONS.map((direction, index) => (
              <div key={direction.variant} className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-sm">
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--foreground)]">
                    {direction.variant}
                  </span>
                  <span
                    className="faro-generation-dot h-2 w-2 rounded-full bg-white/60"
                    style={{ animationDelay: `${index * 240}ms` }}
                    aria-hidden="true"
                  />
                </div>
                <p className="text-sm font-semibold">{direction.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{direction.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-white/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Design lens</p>
            <p key={focus} className="faro-generation-focus mt-2 text-sm leading-relaxed text-white/75" aria-hidden="true">
              {focus}
            </p>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-white/45 sm:text-right">
            Real brand work takes a little time. Keep this page open; the proposals will appear here when ready.
          </p>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { IllustrativeFigure, StageIllustration } from "@/components/IllustrativeFigure";

export type UpNext = {
  projectId: string;
  href: string; // where "Continue" goes (the next pillar review screen)
  name: string; // the pillar name
  label: string; // e.g. "Part 2 of 7"
  whatItIs?: string;
  overall: { done: number; total: number };
  /** Six-stage journey id when known (strategy | name | logo | …) */
  stageId?: string | null;
};

export function UpNextCard({ next }: { next: UpNext | null }) {
  if (!next) {
    return (
      <div className="rounded-xl border border-[var(--ok)]/30 bg-[var(--ok)]/10 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <IllustrativeFigure
            id="stepHandoff"
            size="sm"
            className="shrink-0 border border-[var(--ok)]/20"
            decorative
          />
          <div>
            <div className="flex items-center gap-2 text-[var(--ok)]">
              <PartyPopper size={18} />
              <span className="font-medium">Journey complete</span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              All stages are done. Revisit any step from the journey rail, or open Content Studio for
              monthly social content.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-shadow rounded-xl border border-[var(--accent)]/30 bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {next.stageId ? (
          <StageIllustration
            stageId={next.stageId}
            size="sm"
            className="shrink-0 border border-[var(--border)]"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
            Up next
          </div>

          <div className="mt-1.5">
            <div className="text-xs text-[var(--muted)]">{next.label}</div>
            <h2 className="mt-0.5 font-serif text-xl font-semibold tracking-tight">{next.name}</h2>
            {next.whatItIs && <p className="mt-1 text-sm text-[var(--muted)]">{next.whatItIs}</p>}
          </div>

          <ProgressBar done={next.overall.done} total={next.overall.total} className="mt-3" showPercent />

          <div className="mt-4">
            <Link
              href={next.href}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              Continue · {next.name} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

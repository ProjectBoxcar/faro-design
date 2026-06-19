import Link from "next/link";
import { ArrowRight, Lock, PartyPopper } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

export type UpNext = {
  projectId: string;
  sectionId: string;
  name: string;
  pillarName: string;
  phaseName: string;
  whatItIs?: string;
  phasePercent: number;
  overall: { done: number; total: number };
  locked: boolean;
  lockReason?: string;
};

export function UpNextCard({ next }: { next: UpNext | null }) {
  // Whole journey complete.
  if (!next) {
    return (
      <div className="rounded-2xl border border-[var(--ok)]/40 bg-[var(--surface)] p-6">
        <div className="flex items-center gap-2 text-[var(--ok)]">
          <PartyPopper size={18} />
          <span className="font-medium">Every step is complete</span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          You&apos;ve worked through the whole process. The handover brief is ready to share.
        </p>
      </div>
    );
  }

  return (
    <div className="card-shadow rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
      <div className="text-xs uppercase tracking-wider text-[var(--subtle)]">Up next</div>

      <div className="mt-2">
        <div className="text-xs text-[var(--muted)]">
          {next.phaseName} · {next.pillarName} · {next.phasePercent}% of this phase
        </div>
        <h2 className="mt-0.5 font-serif text-2xl font-semibold tracking-tight">{next.name}</h2>
        {next.whatItIs && <p className="mt-1.5 text-sm text-[var(--muted)]">{next.whatItIs}</p>}
      </div>

      <ProgressBar done={next.overall.done} total={next.overall.total} className="mt-4" showPercent />

      <div className="mt-5">
        {next.locked ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]">
            <Lock size={15} /> {next.lockReason ?? "Locked"}
          </div>
        ) : (
          <Link
            href={`/projects/${next.projectId}/${encodeURIComponent(next.sectionId)}`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
          >
            Continue <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}

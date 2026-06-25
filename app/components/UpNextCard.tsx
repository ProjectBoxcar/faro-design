import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

export type UpNext = {
  projectId: string;
  href: string; // where "Continue" goes (the next pillar review screen)
  name: string; // the pillar name
  label: string; // e.g. "Part 2 of 7"
  whatItIs?: string;
  overall: { done: number; total: number };
};

export function UpNextCard({ next }: { next: UpNext | null }) {
  // Whole guided review complete.
  if (!next) {
    return (
      <div className="rounded-2xl border border-[var(--ok)]/40 bg-[var(--surface)] p-6">
        <div className="flex items-center gap-2 text-[var(--ok)]">
          <PartyPopper size={18} />
          <span className="font-medium">You&apos;ve reviewed your whole strategy</span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Everything&apos;s in place. When you&apos;re ready, hand the brief to your designer.
        </p>
      </div>
    );
  }

  return (
    <div className="card-shadow rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
      <div className="text-xs uppercase tracking-wider text-[var(--subtle)]">Up next</div>

      <div className="mt-2">
        <div className="text-xs text-[var(--muted)]">{next.label}</div>
        <h2 className="mt-0.5 font-serif text-2xl font-semibold tracking-tight">{next.name}</h2>
        {next.whatItIs && <p className="mt-1.5 text-sm text-[var(--muted)]">{next.whatItIs}</p>}
      </div>

      <ProgressBar done={next.overall.done} total={next.overall.total} className="mt-4" showPercent />

      <div className="mt-5">
        <Link
          href={next.href}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
        >
          Continue <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

import { Check, Lock } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

// One phase in the journey. Progress fields are optional so the same arc works
// as a generic explainer (on the dashboard) and as a live tracker (in a project).
export type ArcPhase = {
  id: string;
  name: string;
  oneLiner: string;
  produces: string;
  done?: number;
  total?: number;
  isCurrent?: boolean;
  unlocked?: boolean;
};

// The whole strategy at a glance: the phases in order and what each one leaves you
// with. Horizontal on desktop, stacked on mobile.
export function StrategyArc({ phases }: { phases: ArcPhase[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {phases.map((p, i) => {
        const hasProgress = typeof p.total === "number";
        const complete = hasProgress && p.total! > 0 && p.done === p.total;
        return (
          <li
            key={p.id}
            className={`card-shadow flex flex-col rounded-2xl border bg-[var(--surface)] p-4 ${
              p.isCurrent ? "border-[var(--accent)]" : "border-[var(--border)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                  complete
                    ? "bg-[var(--ok)] text-white"
                    : p.isCurrent
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
              >
                {complete ? <Check size={13} /> : p.unlocked === false ? <Lock size={11} /> : i + 1}
              </span>
              <span className="text-sm font-medium">{p.name}</span>
              {p.isCurrent && (
                <span className="ml-auto rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
                  now
                </span>
              )}
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{p.oneLiner}</p>

            <p className="mt-auto border-t border-[var(--border)] pt-2 text-[11px] text-[var(--subtle)]">
              <span className="font-medium text-[var(--muted)]">You&apos;ll have:</span> {p.produces}
            </p>

            {hasProgress && p.total! > 0 && (
              <ProgressBar done={p.done ?? 0} total={p.total!} className="mt-2.5" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

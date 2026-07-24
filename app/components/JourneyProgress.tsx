import { Check } from "lucide-react";

export type JourneyStep = {
  id: string;
  label: string;
  /** Short label for dense card layout */
  short: string;
  done: number;
  total: number;
};

// Compact journey track matching the app's methodology phases:
// Strategic → Handoff → Planning → Design. Each node is a point on the process.
export function JourneyProgress({
  steps,
  className = "",
}: {
  steps: JourneyStep[];
  className?: string;
}) {
  const strategySteps = steps.filter((s) => s.id !== "design");
  const filledDone = strategySteps.reduce((n, s) => n + s.done, 0);
  const filledTotal = strategySteps.reduce((n, s) => n + s.total, 0);
  const pct = filledTotal === 0 ? 0 : Math.round((filledDone / filledTotal) * 100);

  // First incomplete strategy step is "current"; design is only current when strategy is done.
  const strategyComplete = strategySteps.every((s) => s.total === 0 || s.done >= s.total);
  let currentIndex = steps.findIndex((s) => s.total > 0 && s.done < s.total);
  if (currentIndex < 0) currentIndex = steps.length - 1;
  if (!strategyComplete) {
    const designIdx = steps.findIndex((s) => s.id === "design");
    if (designIdx >= 0 && currentIndex === designIdx) {
      currentIndex = Math.max(
        0,
        steps.findIndex((s) => s.id !== "design" && s.total > 0 && s.done < s.total)
      );
    }
  }

  return (
    <div className={className}>
      <ol className="flex items-start justify-between gap-1">
        {steps.map((step, i) => {
          const complete = step.total > 0 && step.done >= step.total;
          const isCurrent = i === currentIndex;
          const locked = step.id === "design" && !strategyComplete;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 flex-1 rounded-full ${
                      steps[i - 1] && steps[i - 1].total > 0 && steps[i - 1].done >= steps[i - 1].total
                        ? "bg-[var(--accent)]"
                        : "bg-[var(--border-strong)]"
                    }`}
                  />
                )}
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    complete
                      ? "bg-[var(--accent)] text-white"
                      : isCurrent && !locked
                      ? "border-2 border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)]"
                      : locked
                      ? "border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--subtle)]"
                      : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)]"
                  }`}
                  title={
                    step.total > 0
                      ? `${step.label}: ${Math.min(step.done, step.total)}/${step.total}`
                      : step.label
                  }
                >
                  {complete ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 rounded-full ${
                      complete ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-1.5 max-w-full truncate px-0.5 text-[10px] leading-tight ${
                  isCurrent && !locked
                    ? "font-semibold text-[var(--foreground)]"
                    : complete
                    ? "text-[var(--muted)]"
                    : "text-[var(--subtle)]"
                }`}
              >
                {step.short}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-[var(--subtle)]">{pct}%</span>
      </div>
    </div>
  );
}

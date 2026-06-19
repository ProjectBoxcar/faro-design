export function ProgressBar({
  done,
  total,
  className = "",
  showPercent = false,
}: {
  done: number;
  total: number;
  className?: string;
  showPercent?: boolean;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const bar = (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
      <div
        className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );

  if (!showPercent) return <div className={className}>{bar}</div>;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1">{bar}</div>
      <span className="shrink-0 text-xs tabular-nums text-[var(--subtle)]">{pct}%</span>
    </div>
  );
}

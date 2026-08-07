import Link from "next/link";
import type { LaneHealthSummary } from "@/lib/ai-lanes";

/**
 * Surfaces AI/ops readiness on home so long-run stages (logo/design/content)
 * don't fail silently. Links to Settings for fixes.
 */
export function SetupReadinessBanner({
  lanes,
  daemonUp,
}: {
  lanes: LaneHealthSummary[];
  daemonUp: boolean | null;
}) {
  const strategy = lanes.find((l) => l.lane === "strategy");
  const logo = lanes.find((l) => l.lane === "logo");
  const design = lanes.find((l) => l.lane === "design");

  const issues: string[] = [];
  if (strategy && strategy.level === "off") {
    issues.push("Strategy writing needs a Claude key (Settings).");
  }
  if (logo && logo.level === "off") {
    issues.push("Logo Workshop needs an OpenAI or Gemini key (Settings).");
  }
  if (design && design.level === "off") {
    issues.push("Design Studio needs a Claude key and Faro’s design helper running.");
  } else if (daemonUp === false) {
    issues.push("Design helper isn’t running — start Faro with start.bat.");
  }

  if (issues.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-[var(--ok)]/25 bg-[var(--ok)]/10 px-4 py-3 text-sm text-[var(--ok)]">
        <span className="font-medium">AI setup ready.</span>{" "}
        <span className="text-[var(--muted)]">
          Strategy, logo, and design look good
          {daemonUp === true ? " · design helper up" : ""}. Longer steps may still take a few minutes.
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="mb-6 rounded-xl border border-[var(--warn)]/35 bg-[var(--warn)]/10 px-4 py-3 text-sm"
    >
      <p className="font-medium text-[var(--warn)]">A bit of setup before AI stages</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--muted)]">
        {issues.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--subtle)]">
        Fix in{" "}
        <Link href="/settings" className="font-medium text-[var(--foreground)] underline-offset-2 hover:underline">
          Settings
        </Link>
        , then start Faro with <code className="rounded bg-[var(--surface-2)] px-1">start.bat</code> if needed.
      </p>
    </div>
  );
}

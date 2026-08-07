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
    issues.push("Strategy AI key missing — Express and content planning need it.");
  }
  if (logo && logo.level === "off") {
    issues.push("Logo AI key missing — Logo Workshop needs OpenAI or Gemini.");
  }
  if (design && design.level === "off") {
    issues.push("Design AI / Open Design not ready — Design Studio needs Anthropic BYOK + daemon.");
  } else if (daemonUp === false) {
    issues.push("Open Design daemon is not running (start with start.bat / npm run dev).");
  }

  if (issues.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-[var(--ok)]/25 bg-[var(--ok)]/10 px-4 py-3 text-sm text-[var(--ok)]">
        <span className="font-medium">AI setup ready.</span>{" "}
        <span className="text-[var(--muted)]">
          Strategy, logo, and design lanes look good
          {daemonUp === true ? " · Open Design daemon up" : ""}. Long generations may still take a few minutes.
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="mb-6 rounded-xl border border-[var(--warn)]/35 bg-[var(--warn)]/10 px-4 py-3 text-sm"
    >
      <p className="font-medium text-[var(--warn)]">Setup needed before long AI stages</p>
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
        , then run <code className="rounded bg-[var(--surface-2)] px-1">start.bat</code> if the design daemon is down.
      </p>
    </div>
  );
}

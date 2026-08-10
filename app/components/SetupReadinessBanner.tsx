"use client";

import Link from "next/link";
import type { LaneHealthSummary } from "@/lib/ai-lanes";
import { useLocale } from "@/components/LocaleProvider";

export function SetupReadinessBanner({
  lanes,
  daemonUp,
}: {
  lanes: LaneHealthSummary[];
  daemonUp: boolean | null;
}) {
  const { t } = useLocale();
  const strategy = lanes.find((l) => l.lane === "strategy");
  const logo = lanes.find((l) => l.lane === "logo");
  const design = lanes.find((l) => l.lane === "design");

  const issues: string[] = [];
  if (strategy && strategy.level === "off") {
    issues.push(t("setup.strategyOff"));
  }
  if (logo && logo.level === "off") {
    issues.push(t("setup.logoOff"));
  }
  if (design && design.level === "off") {
    issues.push(t("setup.designOff"));
  } else if (daemonUp === false) {
    issues.push(t("setup.daemonDown"));
  }

  if (issues.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-[var(--ok)]/25 bg-[var(--ok)]/10 px-4 py-3 text-sm text-[var(--ok)]">
        <span className="font-medium">{t("setup.ready")}</span>{" "}
        <span className="text-[var(--muted)]">
          {t("setup.readyDetail", {
            daemon: daemonUp === true ? t("setup.daemonUp") : "",
          })}
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="mb-6 rounded-xl border border-[var(--warn)]/35 bg-[var(--warn)]/10 px-4 py-3 text-sm"
    >
      <p className="font-medium text-[var(--warn)]">{t("setup.needed")}</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--muted)]">
        {issues.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <p className="mt-2 text-[var(--muted)]">
        <Link href="/settings" className="font-medium text-[var(--foreground)] underline-offset-2 hover:underline">
          {t("nav.settings")}
        </Link>
        {t("setup.footerAfterLink")}
      </p>
    </div>
  );
}

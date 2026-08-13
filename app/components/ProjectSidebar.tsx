"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  LockKeyhole,
  Settings,
} from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { FaroMark } from "./FaroMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/LocaleProvider";
import type { JourneyStageItem, JourneyStepItem, StageStatus } from "@/lib/sidebar-journey";
import { stageLabelKey } from "@/lib/i18n/messages";

export type { JourneyStageItem, JourneyStepItem, StageStatus };

/** Desktop left rail: one journey list, same status logic for every stage. */
export function ProjectSidebar({
  projectId,
  projectName,
  clientName,
  greenfield,
  stages,
  overall,
}: {
  projectId: string;
  projectName: string;
  clientName?: string | null;
  greenfield?: boolean;
  stages: JourneyStageItem[];
  overall: { done: number; total: number };
}) {
  const pathname = usePathname();
  const { t } = useLocale();

  function isStageActive(stage: JourneyStageItem): boolean {
    const base = `/projects/${projectId}`;
    if (stage.id === "strategy") {
      if (pathname === base) return true;
      if (pathname.startsWith(`${base}/express`)) return true;
      if (pathname.startsWith(`${base}/review`)) return true;
      // Section editor under project — not name / studio / design / handover
      if (
        pathname.startsWith(`${base}/`) &&
        !pathname.startsWith(`${base}/studio`) &&
        !pathname.startsWith(`${base}/design`) &&
        !pathname.startsWith(`${base}/handover`) &&
        !pathname.startsWith(`${base}/name`)
      ) {
        return true;
      }
      return false;
    }
    if (stage.id === "name") return pathname.startsWith(`${base}/name`);
    if (stage.id === "logo") return pathname.startsWith(`${base}/studio`);
    if (stage.id === "design") return pathname.startsWith(`${base}/design`);
    if (stage.id === "handover") return pathname.startsWith(`${base}/handover`);
    if (stage.id === "content") return pathname.startsWith(`${base}/content`);
    return pathname === stage.href || pathname.startsWith(`${stage.href}/`);
  }

  return (
    <aside
      className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[var(--border)] lg:flex"
      style={{
        backgroundColor: "color-mix(in srgb, var(--background) 92%, transparent)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="p-5 pb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={15} /> {t("nav.allProjects")}
        </Link>
      </div>

      <div className="px-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="block text-[var(--foreground)] opacity-80 transition hover:opacity-100"
            aria-label="Faro Design home"
          >
            <FaroMark className="h-6 w-auto max-w-[11rem]" />
          </Link>
          <LanguageSwitcher />
        </div>
        <Link href={`/projects/${projectId}`} className="block">
          <h1 className="font-serif text-xl font-normal tracking-tight">{projectName}</h1>
        </Link>
        {clientName && <p className="text-sm text-[var(--muted)]">{clientName}</p>}
        {greenfield && (
          <p className="mt-1 text-xs text-[var(--subtle)]">{t("projects.greenfield")}</p>
        )}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--subtle)]">
            <span>{t("nav.journey")}</span>
            <span className="tabular-nums">
              {overall.done}/{overall.total}
            </span>
          </div>
          <ProgressBar done={overall.done} total={overall.total} showPercent />
        </div>
      </div>

      <nav aria-label="Project journey" className="mt-5 flex-1 overflow-y-auto px-3 pb-6">
        <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
          {t("nav.stages")}
        </p>
        <ol className="space-y-1">
          {stages.map((stage) => (
            <StageRow
              key={stage.id}
              stage={stage}
              active={isStageActive(stage)}
              pathname={pathname}
            />
          ))}
        </ol>

        <p className="mt-4 px-2.5 text-[11px] leading-snug text-[var(--subtle)]">
          {t("nav.journeyOrder")}
        </p>
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          <Settings size={15} /> {t("nav.settings")}
        </Link>
      </div>
    </aside>
  );
}

function StageRow({
  stage,
  active,
  pathname,
}: {
  stage: JourneyStageItem;
  active: boolean;
  pathname: string;
}) {
  const { t } = useLocale();
  const hasSteps = Boolean(stage.steps?.length);
  const locked = stage.status === "locked";
  // Auto: expand the stage you are on, or the stage that is "Next".
  // Collapse everything else so location is obvious.
  const autoOpen = !locked && hasSteps && (active || stage.status === "current");
  // null = follow auto; boolean = user override until navigation changes
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);

  useEffect(() => {
    // Route / stage status changed — snap expand/collapse to location.
    setManualOpen(null);
  }, [pathname, active, stage.status, stage.id]);

  const open = manualOpen !== null ? manualOpen : autoOpen;
  const href = locked ? undefined : stage.href;

  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

  const num = stage.name.match(/^(\d+\.\s*)/)?.[1] ?? "";
  const stageTitle = `${num}${t(stageLabelKey(stage.id))}`;

  const rowClass = [
    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition",
    locked ? "cursor-not-allowed opacity-55" : "hover:bg-[var(--surface-2)]",
    active && !locked ? "bg-[var(--accent-soft)]" : "",
  ].join(" ");

  const main = (
    <>
      <StatusDot status={stage.status} active={active} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--foreground)]">{stageTitle}</span>
          <StatusBadge status={stage.status} viewing={active && stage.status !== "done"} />
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[var(--subtle)]">{stage.detail}</span>
      </span>
    </>
  );

  return (
    <li>
      <div className="flex items-center gap-0.5">
        {href ? (
          <Link
            href={href}
            data-faro-anchor={
              stage.status === "current" || active ? "faro-journey-current" : undefined
            }
            className={`min-w-0 flex-1 ${rowClass}`}
            aria-current={active ? "page" : undefined}
          >
            {main}
          </Link>
        ) : (
          <div className={`min-w-0 flex-1 ${rowClass}`} aria-disabled="true">
            {main}
          </div>
        )}
        {hasSteps && !locked && (
          <button
            type="button"
            onClick={() => setManualOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Collapse steps" : "Expand steps"}
            className="shrink-0 rounded-lg p-2 text-[var(--subtle)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {hasSteps && open && !locked && (
        <ol className="mb-2 ml-5 mt-0.5 space-y-0.5 border-l border-[var(--border)] pl-2.5">
          {stage.steps!.map((step) => {
            const hashId = step.href.includes("#") ? `#${step.href.split("#")[1]}` : "";
            const onReview = pathname.includes(`/review/${step.id}`);
            const onDesignStep =
              pathname.includes("/design") &&
              Boolean(hashId) &&
              (hash === hashId ||
                // No hash yet: highlight the current design sub-step only
                (!hash && step.status === "current"));
            const viewing = onReview || onDesignStep;
            return (
              <li key={step.id}>
                <StepRow step={step} viewing={viewing} />
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}

function StepRow({ step, viewing }: { step: JourneyStepItem; viewing: boolean }) {
  const locked = step.status === "locked";
  const className = [
    "flex items-center gap-2 rounded-lg px-2 py-1.5 transition",
    locked ? "cursor-not-allowed opacity-50" : "hover:bg-[var(--surface-2)]",
    viewing && !locked ? "bg-[var(--accent-soft)]" : "",
  ].join(" ");

  const body = (
    <>
      <StatusDot status={step.status} active={viewing} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={`truncate text-[13px] ${
              viewing || step.status === "current" ? "font-medium text-[var(--foreground)]" : "text-[var(--muted)]"
            }`}
          >
            {step.name}
          </span>
          <StatusBadge status={step.status} viewing={viewing && step.status !== "done"} compact />
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-[var(--subtle)]">{step.detail}</span>
      </span>
    </>
  );

  if (locked) {
    return <div className={className}>{body}</div>;
  }
  return (
    <Link href={step.href} className={className} aria-current={viewing ? "page" : undefined}>
      {body}
    </Link>
  );
}

function StatusDot({
  status,
  active,
  size,
}: {
  status: StageStatus;
  active?: boolean;
  size: "sm" | "lg";
}) {
  const box = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  const icon = size === "lg" ? 13 : 11;

  if (status === "done") {
    return (
      <span
        className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-[var(--ok)] text-white`}
        aria-label="Done"
      >
        <Check size={icon} strokeWidth={3} />
      </span>
    );
  }
  if (status === "locked") {
    return (
      <span
        className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--muted)]`}
        aria-label="Locked"
      >
        <LockKeyhole size={icon - 2} />
      </span>
    );
  }
  if (status === "current" || active) {
    return (
      <span
        className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white`}
        aria-label="Current"
      >
        <span className={`${size === "lg" ? "h-2 w-2" : "h-1.5 w-1.5"} rounded-full bg-white`} />
      </span>
    );
  }
  // todo
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)]`}
      aria-label="To do"
    >
      <span className={`${size === "lg" ? "h-2 w-2" : "h-1.5 w-1.5"} rounded-full bg-[var(--border-strong)]`} />
    </span>
  );
}

function StatusBadge({
  status,
  viewing,
  compact,
}: {
  status: StageStatus;
  viewing?: boolean;
  compact?: boolean;
}) {
  const cls = compact
    ? "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
    : "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide";

  if (viewing && status !== "done" && status !== "locked") {
    return <span className={`${cls} bg-[var(--accent)] text-white`}>Viewing</span>;
  }
  if (status === "current") {
    return <span className={`${cls} bg-[var(--accent)] text-white`}>Next</span>;
  }
  if (status === "done") {
    return <span className={`${cls} bg-[var(--ok)]/15 text-[var(--ok)]`}>Done</span>;
  }
  if (status === "locked") {
    return <span className={`${cls} bg-[var(--surface-2)] text-[var(--subtle)]`}>Locked</span>;
  }
  return null;
}

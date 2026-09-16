"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  Map,
  Phone,
  Settings,
  X,
} from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/LocaleProvider";
import type { JourneyStageItem, StageStatus } from "@/lib/sidebar-journey";

function stageTone(status: StageStatus, active: boolean): string {
  if (active) return "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40";
  if (status === "done") return "bg-[var(--ok)]/10 text-[var(--ok)] border-[var(--ok)]/25";
  if (status === "locked") return "text-[var(--subtle)] border-[var(--border)] opacity-60";
  if (status === "current") return "border-[var(--accent)]/50 text-[var(--accent)]";
  return "border-[var(--border)] text-[var(--muted)]";
}

/** Mobile sticky bar: journey progress + full stage sheet (parity with desktop rail). */
export function ProjectMobileBar({
  projectId,
  projectName,
  overall,
  stages = [],
}: {
  projectId: string;
  projectName: string;
  overall: { done: number; total: number };
  stages?: JourneyStageItem[];
  /** @deprecated kept for call-site compat — use stages */
  assetStudioUnlocked?: boolean;
  /** @deprecated kept for call-site compat — use stages */
  designStudioUnlocked?: boolean;
}) {
  const path = usePathname();
  const { t } = useLocale();
  const onHub = path === `/projects/${projectId}`;
  const onCall = path.startsWith(`/projects/${projectId}/call`);
  const backHref = onHub ? "/" : `/projects/${projectId}`;
  const [open, setOpen] = useState(false);

  const current = stages.find((s) => s.status === "current");
  const shortName = (name: string) => name.replace(/^\d+\.\s*/, "");

  return (
    <header
      data-project-chrome="mobile"
      className="sticky top-0 z-40 border-b border-[var(--border)] lg:hidden"
      style={{
        backgroundColor: "color-mix(in srgb, var(--background) 90%, transparent)",
        backdropFilter: "blur(20px)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            aria-label="Back"
            className="-ml-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition active:bg-[var(--surface-2)]"
          >
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{projectName}</p>
            <p className="truncate text-[10px] text-[var(--subtle)]">
              {current ? `${shortName(current.name)} · ` : ""}
              <span className="tabular-nums">
                {overall.done}/{overall.total} stages
              </span>
            </p>
          </div>
          <LanguageSwitcher className="shrink-0 scale-90" />
          {!onCall ? (
            <Link
              href={`/projects/${projectId}/call`}
              aria-label={t("call.joinWithFaro")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)] transition active:bg-[var(--accent-soft)]"
            >
              <Phone size={14} />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] active:bg-[var(--surface-2)]"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <Map size={13} />
            {t("nav.stages")}
          </button>
          <Link
            href="/settings"
            aria-label="Settings"
            className="-mr-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition active:bg-[var(--surface-2)]"
          >
            <Settings size={16} />
          </Link>
        </div>
        <div className="mt-1.5">
          <ProgressBar done={overall.done} total={overall.total} />
        </div>
      </div>

      {/* Stage chips — hide on dense work routes; Stages sheet still has the full list */}
      {stages.length > 0 &&
      !path.includes("/design") &&
      !path.includes("/express") &&
      !path.includes("/studio") &&
      !path.includes("/call") ? (
        <div className="flex gap-1 overflow-x-auto border-t border-[var(--border)] px-3 py-1.5 scrollbar-none">
          {stages.map((s) => {
            const active =
              path === s.href ||
              path.startsWith(s.href + "/") ||
              (s.id === "logo" && path.includes("/studio")) ||
              (s.id === "strategy" &&
                (path.includes("/express") || path.includes("/review") || path === `/projects/${projectId}`));
            const locked = s.status === "locked";
            if (locked) {
              return (
                <span
                  key={s.id}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${stageTone(s.status, false)}`}
                >
                  <LockKeyhole size={10} />
                  {shortName(s.name)}
                </span>
              );
            }
            return (
              <Link
                key={s.id}
                href={s.href}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${stageTone(s.status, Boolean(active))}`}
                aria-current={active ? "page" : undefined}
              >
                {s.status === "done" ? <Check size={10} /> : null}
                {shortName(s.name)}
              </Link>
            );
          })}
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/35"
          role="dialog"
          aria-modal="true"
          aria-label="Journey stages"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] px-4 pb-8 pt-3"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">{t("nav.journey")}</p>
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] active:bg-[var(--surface-2)]"
              >
                <X size={18} />
              </button>
            </div>
            {!onCall ? (
              <Link
                href={`/projects/${projectId}/call`}
                onClick={() => setOpen(false)}
                className="mb-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2.5 text-sm font-semibold text-[var(--accent)] transition active:opacity-90"
              >
                <Phone size={15} /> {t("call.joinWithFaro")}
              </Link>
            ) : null}
            <ul className="space-y-1">
              {stages.map((s) => {
                const locked = s.status === "locked";
                const active = path === s.href || path.startsWith(s.href + "/");
                return (
                  <li key={s.id}>
                    {locked ? (
                      <div className="rounded-xl border border-dashed border-[var(--border)] px-3 py-2.5 opacity-70">
                        <p className="text-sm font-medium text-[var(--subtle)]">
                          <LockKeyhole size={13} className="mr-1.5 inline" />
                          {s.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--subtle)]">{s.detail}</p>
                      </div>
                    ) : (
                      <Link
                        href={s.href}
                        onClick={() => setOpen(false)}
                        className={`block rounded-xl border px-3 py-2.5 transition active:bg-[var(--surface-2)] ${
                          active
                            ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]"
                            : "border-[var(--border)] bg-[var(--surface)]"
                        }`}
                      >
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{s.detail}</p>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </header>
  );
}

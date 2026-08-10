"use client";

/**
 * Faro journey coach — floating companion from welcome through the full brand journey.
 * Tips are pure path maps (lib/journey-coach-pure). Minimize/hide in localStorage / session.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { FaroBeacon } from "@/components/FaroLoader";
import {
  coachTipFromPath,
  projectIdFromPath,
  resolveCoachCtaHref,
  type CoachTip,
} from "@/lib/journey-coach-pure";

const MIN_KEY = "faro-journey-coach-minimized";
const HIDE_KEY = "faro-journey-coach-hidden-session";

export function JourneyCoach() {
  const pathname = usePathname() || "/";
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setMinimized(localStorage.getItem(MIN_KEY) === "1");
      setHidden(sessionStorage.getItem(HIDE_KEY) === "1");
    } catch {
      /* private mode */
    }
    setReady(true);
  }, []);

  const persistMin = useCallback((value: boolean) => {
    setMinimized(value);
    try {
      localStorage.setItem(MIN_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const hideSession = useCallback(() => {
    setHidden(true);
    try {
      sessionStorage.setItem(HIDE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const tipResult = coachTipFromPath(pathname);
  if (!ready || tipResult.scene === "hidden" || hidden) return null;

  const tip = tipResult as CoachTip;
  const projectId = projectIdFromPath(pathname);
  const ctaHref = resolveCoachCtaHref(tip, projectId);
  const onProject = Boolean(projectId);

  if (minimized) {
    return (
      <div
        className={`fixed z-[60] ${
          onProject ? "bottom-[4.75rem] right-4 lg:bottom-6 lg:right-6" : "bottom-5 right-4 sm:bottom-6 sm:right-6"
        }`}
      >
        <button
          type="button"
          onClick={() => persistMin(false)}
          className="group flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] py-2 pl-2 pr-3.5 shadow-[var(--shadow-pop)] transition hover:border-[var(--accent)]"
          aria-label="Open Faro guide"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <FaroBeacon size="sm" />
          </span>
          <span className="text-xs font-semibold text-[var(--foreground)]">Faro</span>
          <ChevronUp size={14} className="text-[var(--muted)] group-hover:text-[var(--accent)]" />
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`fixed z-[60] w-[min(100vw-1.5rem,20.5rem)] ${
        onProject ? "bottom-[4.75rem] right-3 lg:bottom-6 lg:right-6" : "bottom-4 right-3 sm:bottom-6 sm:right-6"
      }`}
      aria-label="Faro journey guide"
    >
      <div className="card-shadow overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]">
        <div className="flex items-start gap-3 border-b border-[var(--border)] bg-[var(--surface-2)]/80 px-3.5 py-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]/20">
            <FaroBeacon size="sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Faro</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">
              {tip.title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => persistMin(true)}
              className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              aria-label="Minimize guide"
              title="Minimize"
            >
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              onClick={hideSession}
              className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              aria-label="Hide guide for this session"
              title="Hide for this session"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="px-3.5 py-3">
          <p className="text-sm leading-relaxed text-[var(--muted)]">{tip.body}</p>
          {ctaHref && tip.ctaLabel ? (
            <Link
              href={ctaHref}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            >
              {tip.ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

"use client";

/**
 * Faro journey coach — AI-powered lighthouse guide from welcome through the journey.
 * Falls back to static wise tips when strategy AI is off or slow.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Send, X } from "lucide-react";
import { FaroCoachMark } from "@/components/FaroCoachMark";
import {
  coachTipFromPath,
  projectIdFromPath,
  resolveCoachCtaHref,
  type CoachTip,
} from "@/lib/journey-coach-pure";

const MIN_KEY = "faro-journey-coach-minimized";
const HIDE_KEY = "faro-journey-coach-hidden-session";

type LiveGuidance = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHrefTemplate?: string;
  source: "ai" | "fallback";
  scene: string;
  aiAvailable: boolean;
};

export function JourneyCoach() {
  const pathname = usePathname() || "/";
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [guidance, setGuidance] = useState<LiveGuidance | null>(null);
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [showAsk, setShowAsk] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pathKeyRef = useRef("");

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

  const seedTip = coachTipFromPath(pathname);
  const projectId = projectIdFromPath(pathname);
  const onProject = Boolean(projectId);

  const fetchGuidance = useCallback(
    async (path: string, q?: string) => {
      const tip = coachTipFromPath(path);
      if (tip.scene === "hidden") {
        setGuidance(null);
        return;
      }

      // Instant seed so the lighthouse always has words
      if (!q) {
        setGuidance({
          title: tip.title,
          body: tip.body,
          ctaLabel: tip.ctaLabel,
          ctaHrefTemplate: tip.ctaHrefTemplate,
          source: "fallback",
          scene: tip.scene,
          aiAvailable: true,
        });
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(!q);
      if (q) setAsking(true);

      try {
        const res = await fetch("/api/journey-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pathname: path, question: q || null }),
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("coach failed");
        const data = (await res.json()) as LiveGuidance;
        if (data.scene === "hidden") {
          setGuidance(null);
          return;
        }
        setGuidance(data);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        // keep seed tip
      } finally {
        setLoading(false);
        setAsking(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!ready || hidden) return;
    if (seedTip.scene === "hidden") {
      setGuidance(null);
      return;
    }
    if (pathKeyRef.current === pathname) return;
    pathKeyRef.current = pathname;
    setQuestion("");
    setShowAsk(false);
    void fetchGuidance(pathname);
    return () => {
      abortRef.current?.abort();
    };
  }, [pathname, ready, hidden, seedTip.scene, fetchGuidance]);

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    await fetchGuidance(pathname, q);
    setQuestion("");
  }

  if (!ready || seedTip.scene === "hidden" || hidden) return null;

  const tip = (guidance ?? (seedTip as CoachTip)) as LiveGuidance | CoachTip;
  const title = "title" in tip ? tip.title : (seedTip as CoachTip).title;
  const body = "body" in tip ? tip.body : (seedTip as CoachTip).body;
  const ctaLabel =
    "ctaLabel" in tip ? tip.ctaLabel : (seedTip as CoachTip).ctaLabel;
  const ctaTemplate =
    "ctaHrefTemplate" in tip
      ? tip.ctaHrefTemplate
      : (seedTip as CoachTip).ctaHrefTemplate;
  const ctaHref = resolveCoachCtaHref(
    {
      scene: seedTip.scene === "hidden" ? "home" : seedTip.scene,
      title,
      body,
      ctaLabel,
      ctaHrefTemplate: ctaTemplate,
    },
    projectId
  );
  const source = guidance?.source ?? "fallback";
  const aiAvailable = guidance?.aiAvailable ?? true;

  const pos = onProject
    ? "bottom-[4.75rem] right-3 lg:bottom-6 lg:right-6"
    : "bottom-4 right-3 sm:bottom-6 sm:right-6";

  if (minimized) {
    return (
      <div className={`fixed z-[60] ${pos}`}>
        <button
          type="button"
          onClick={() => persistMin(false)}
          className="faro-coach-lighthouse group relative flex flex-col items-center"
          aria-label="Open Faro guide"
        >
          <FaroCoachMark size={52} lit />
          <span className="mt-1 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground)] shadow-[var(--shadow-card)]">
            Faro
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside className={`fixed z-[60] w-[min(100vw-1.5rem,21rem)] ${pos}`} aria-label="Faro journey guide">
      {/* Lighthouse figure + light beam panel */}
      <div className="relative">
        <div className="pointer-events-none absolute -left-2 bottom-2 z-10 sm:-left-3">
          <FaroCoachMark size={64} lit={!loading} />
        </div>

        <div
          className="faro-coach-panel card-shadow relative ml-10 overflow-hidden border border-[var(--border-strong)] bg-[var(--surface)] sm:ml-12"
          style={{
            clipPath:
              "polygon(8% 0, 100% 0, 100% 100%, 0 100%, 0 12%, 6% 6%)",
            borderRadius: "1.25rem 1.25rem 1.25rem 0.35rem",
          }}
        >
          {/* Beacon stripe header */}
          <div className="flex items-start gap-2 border-b border-[var(--border)] bg-gradient-to-r from-[var(--accent-soft)] via-[var(--surface-2)] to-[var(--surface)] px-3.5 py-2.5 pl-4">
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <p className="font-serif text-base font-medium tracking-tight text-[var(--foreground)]">
                  Faro
                </p>
                <span className="rounded-full bg-[var(--accent)]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {source === "ai" ? "Live guide" : aiAvailable ? "Beacon" : "Steady light"}
                </span>
              </div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">
                {title}
                {loading ? " · thinking…" : ""}
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

          <div className="px-3.5 py-3 pl-4">
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {loading && !guidance ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
                  Finding the next light…
                </span>
              ) : (
                body
              )}
            </p>

            {ctaHref && ctaLabel ? (
              <Link
                href={ctaHref}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)]"
              >
                {ctaLabel}
              </Link>
            ) : null}

            <div className="mt-3 border-t border-[var(--border)] pt-2.5">
              {!showAsk ? (
                <button
                  type="button"
                  onClick={() => setShowAsk(true)}
                  className="text-[11px] font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  Ask Faro for guidance
                </button>
              ) : (
                <form onSubmit={submitQuestion} className="flex items-center gap-1.5">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What should I focus on?"
                    maxLength={400}
                    disabled={asking}
                    className="min-w-0 flex-1 rounded-full border border-[var(--border-strong)] bg-[var(--field)] px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    aria-label="Ask Faro"
                  />
                  <button
                    type="submit"
                    disabled={asking || !question.trim()}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white disabled:opacity-40"
                    aria-label="Send question"
                  >
                    {asking ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAsk(false);
                      setQuestion("");
                    }}
                    className="text-[10px] text-[var(--subtle)]"
                  >
                    Close
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

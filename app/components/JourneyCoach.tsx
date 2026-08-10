"use client";

/**
 * Faro the keeper — dynamic face + brand personality through the journey.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Send, X } from "lucide-react";
import { FaroPersona, FaroPersonaMini } from "@/components/FaroPersona";
import {
  coachTipFromPath,
  projectIdFromPath,
  resolveCoachCtaHref,
  type CoachTip,
} from "@/lib/journey-coach-pure";
import {
  FARO_BRAND_PERSONALITY,
  FARO_MOOD_LABEL,
  moodForScene,
  type FaroMood,
} from "@/lib/faro-persona";
import { useLocale } from "@/components/LocaleProvider";

const MIN_KEY = "faro-journey-coach-minimized";
const HIDE_KEY = "faro-journey-coach-hidden-session";

type LiveGuidance = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHrefTemplate?: string;
  mood?: FaroMood;
  source: "ai" | "fallback";
  scene: string;
  aiAvailable: boolean;
};

type ChatLine = {
  id: string;
  role: "faro" | "you";
  text: string;
  mood?: FaroMood;
};

export function JourneyCoach() {
  const pathname = usePathname() || "/";
  const { locale, t } = useLocale();
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [guidance, setGuidance] = useState<LiveGuidance | null>(null);
  const [mood, setMood] = useState<FaroMood>("calm");
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<ChatLine[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const pathKeyRef = useRef("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      setMinimized(localStorage.getItem(MIN_KEY) === "1");
      setHidden(sessionStorage.getItem(HIDE_KEY) === "1");
    } catch {
      /* private mode */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread, loading, asking, mood]);

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
        setThread([]);
        return;
      }

      const seedMood = moodForScene(tip.scene);
      if (!q) {
        setMood(seedMood);
        setGuidance({
          title: tip.title,
          body: tip.body,
          ctaLabel: tip.ctaLabel,
          ctaHrefTemplate: tip.ctaHrefTemplate,
          mood: seedMood,
          source: "fallback",
          scene: tip.scene,
          aiAvailable: true,
        });
        setThread([
          {
            id: `faro-seed-${path}`,
            role: "faro",
            text: tip.body,
            mood: seedMood,
          },
        ]);
      } else {
        setMood("thinking");
        setThread((prev) => [
          ...prev,
          { id: `you-${Date.now()}`, role: "you", text: q },
        ]);
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
          body: JSON.stringify({
            pathname: path,
            question: q || null,
            locale,
          }),
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("coach failed");
        const data = (await res.json()) as LiveGuidance;
        if (data.scene === "hidden") {
          setGuidance(null);
          return;
        }
        const nextMood = data.mood ?? moodForScene(data.scene);
        setMood(nextMood);
        setGuidance({ ...data, mood: nextMood });
        setThread((prev) => {
          if (!q) {
            return [
              {
                id: `faro-${path}-${Date.now()}`,
                role: "faro",
                text: data.body,
                mood: nextMood,
              },
            ];
          }
          return [
            ...prev,
            {
              id: `faro-a-${Date.now()}`,
              role: "faro",
              text: data.body,
              mood: nextMood,
            },
          ];
        });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (q) {
          setMood("careful");
          setThread((prev) => [
            ...prev,
            {
              id: `faro-err-${Date.now()}`,
              role: "faro",
              text: t("coach.error"),
              mood: "careful",
            },
          ]);
        }
      } finally {
        setLoading(false);
        setAsking(false);
      }
    },
    [locale, t]
  );

  useEffect(() => {
    if (!ready || hidden) return;
    if (seedTip.scene === "hidden") {
      setGuidance(null);
      setThread([]);
      return;
    }
    // Refetch when path or language changes
    const key = `${pathname}::${locale}`;
    if (pathKeyRef.current === key) return;
    pathKeyRef.current = key;
    setQuestion("");
    void fetchGuidance(pathname);
    return () => {
      abortRef.current?.abort();
    };
  }, [pathname, locale, ready, hidden, seedTip.scene, fetchGuidance]);

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    setQuestion("");
    await fetchGuidance(pathname, q);
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
  const displayMood: FaroMood =
    loading || asking ? "thinking" : mood;

  const pos = onProject
    ? "bottom-[4.75rem] right-3 lg:bottom-5 lg:right-5"
    : "bottom-4 right-3 sm:bottom-5 sm:right-5";

  if (minimized) {
    return (
      <div className={`fixed z-[60] ${pos}`}>
        <button
          type="button"
          onClick={() => persistMin(false)}
          className="group relative"
          aria-label={t("coach.open")}
        >
          <FaroPersona size={58} mood={displayMood} speaking={false} className="shadow-[var(--shadow-pop)]" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-semibold text-white shadow">
            Faro
          </span>
        </button>
      </div>
    );
  }

  const lines =
    thread.length > 0
      ? thread
      : [{ id: "seed", role: "faro" as const, text: body, mood: displayMood }];

  return (
    <aside
      className={`fixed z-[60] w-[min(100vw-1.25rem,22.5rem)] ${pos}`}
      aria-label="Faro, your guide"
    >
      <div className="card-shadow overflow-hidden rounded-[1.35rem] border border-[var(--border-strong)] bg-[var(--surface)]">
        {/* Persona header — brand paper → teal wash */}
        <div className="relative border-b border-[var(--border)] bg-[var(--brand-paper,#F5F1E8)] px-3.5 py-3">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary, #16514B) 14%, transparent) 0%, transparent 55%, color-mix(in srgb, var(--brand-accent, #F25C2A) 10%, transparent) 100%)",
            }}
          />
          <div className="relative flex items-center gap-3">
            <FaroPersona
              size={56}
              mood={displayMood}
              speaking={loading || asking}
              className="shadow-md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg font-medium leading-none tracking-tight text-[var(--foreground)]">
                {FARO_BRAND_PERSONALITY.name}
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {t("coach.role")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-[var(--accent)]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {FARO_MOOD_LABEL[displayMood]}
                </span>
                <span className="truncate text-[10px] font-medium text-[var(--subtle)]">
                  {title}
                  {loading || asking ? " · …" : source === "ai" ? "" : ""}
                </span>
              </div>
            </div>
            <div className="relative flex shrink-0 gap-0.5">
              <button
                type="button"
                onClick={() => persistMin(true)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                aria-label={t("coach.minimize")}
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                onClick={hideSession}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                aria-label={t("coach.hide")}
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <p className="relative mt-2 text-[10px] leading-snug text-[var(--subtle)]">
            {FARO_BRAND_PERSONALITY.kicker} — {FARO_BRAND_PERSONALITY.promise}
          </p>
        </div>

        {/* Dialogue */}
        <div className="flex max-h-[min(42vh,280px)] flex-col gap-2.5 overflow-y-auto px-3 py-3">
          {lines.map((line) =>
            line.role === "faro" ? (
              <div key={line.id} className="flex items-end gap-2">
                <span className="mb-0.5 hidden shrink-0 sm:inline-flex">
                  <FaroPersonaMini mood={line.mood ?? displayMood} />
                </span>
                <div className="faro-speech relative max-w-[92%] rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm leading-relaxed text-[var(--foreground)]">
                  {line.text}
                </div>
              </div>
            ) : (
              <div key={line.id} className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl rounded-br-md bg-[var(--accent)] px-3 py-2.5 text-sm leading-relaxed text-white">
                  {line.text}
                </div>
              </div>
            )
          )}
          {(loading || asking) && (
            <div className="flex items-end gap-2">
              <span className="mb-0.5 hidden h-7 w-7 shrink-0 sm:block" />
              <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
                <span className="faro-persona-dot" />
                <span className="faro-persona-dot" style={{ animationDelay: "0.15s" }} />
                <span className="faro-persona-dot" style={{ animationDelay: "0.3s" }} />
                <span className="sr-only">{t("coach.thinking")}</span>
              </div>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2">
          {ctaHref && ctaLabel ? (
            <Link
              href={ctaHref}
              className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            >
              {ctaLabel}
            </Link>
          ) : null}
          <form onSubmit={submitQuestion} className="flex items-center gap-1.5">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("coach.talkPlaceholder")}
              maxLength={400}
              disabled={asking}
              className="min-w-0 flex-1 rounded-full border border-[var(--border-strong)] bg-[var(--field)] px-3.5 py-2 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--subtle)] focus:border-[var(--accent)]"
              aria-label={t("coach.talkPlaceholder")}
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-white disabled:opacity-40"
              aria-label={t("coach.open")}
            >
              {asking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-[var(--subtle)]">
            {t("coach.footer")}
          </p>
        </div>
      </div>
    </aside>
  );
}

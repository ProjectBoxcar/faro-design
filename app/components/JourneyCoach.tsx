"use client";

/**
 * Faro living assistant — docks to UI touchpoints and travels with the user.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ChevronDown, Loader2, MessageCircle, Send, X } from "lucide-react";
import { FaroPersona, FaroPersonaMini } from "@/components/FaroPersona";
import {
  coachTipFromPath,
  projectIdFromPath,
  resolveCoachCtaHref,
  type CoachScene,
  type CoachTip,
} from "@/lib/journey-coach-pure";
import {
  FARO_BRAND_PERSONALITY,
  FARO_MOOD_LABEL,
  moodForScene,
  type FaroMood,
} from "@/lib/faro-persona";
import {
  dockNearRect,
  resolveAssistantAnchor,
  type DockRect,
} from "@/lib/faro-assistant-anchors";
import { useLocale } from "@/components/LocaleProvider";

const MIN_KEY = "faro-journey-coach-minimized";
const HIDE_KEY = "faro-journey-coach-hidden-session";
const INTERACT_MS = 4500;

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

function sceneFromTip(
  tip: CoachTip | { scene: "hidden" }
): Exclude<CoachScene, "hidden"> | "hidden" {
  return tip.scene;
}

export function JourneyCoach() {
  const pathname = usePathname() || "/";
  const { locale, t } = useLocale();
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [guidance, setGuidance] = useState<LiveGuidance | null>(null);
  const [mood, setMood] = useState<FaroMood>("calm");
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<ChatLine[]>([]);
  const [dock, setDock] = useState<DockRect | null>(null);
  const [traveling, setTraveling] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const pathKeyRef = useRef("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<HTMLElement | null>(null);
  const interactionUntilRef = useRef(0);
  const prevDockRef = useRef<DockRect | null>(null);

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
  }, [thread, loading, asking, mood, openChat]);

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

  const seedTip = coachTipFromPath(pathname, locale);
  const projectId = projectIdFromPath(pathname);
  const scene = sceneFromTip(seedTip);

  /** Track user interactions so Faro walks to what they touch */
  useEffect(() => {
    if (scene === "hidden") return;

    function mark(el: Element | null) {
      if (!el || !(el instanceof HTMLElement)) return;
      // Don't dock onto the assistant itself
      if (el.closest("[data-faro-assistant]")) return;
      const target =
        el.closest<HTMLElement>(
          "[data-faro-anchor], button, a, input, textarea, select, [role='button']"
        ) ?? el;
      if (target.closest("[data-faro-assistant]")) return;
      interactionRef.current = target;
      interactionUntilRef.current = Date.now() + INTERACT_MS;
    }

    function onPointer(e: Event) {
      mark(e.target as Element);
    }

    document.addEventListener("click", onPointer, true);
    document.addEventListener("focusin", onPointer, true);
    return () => {
      document.removeEventListener("click", onPointer, true);
      document.removeEventListener("focusin", onPointer, true);
    };
  }, [scene]);

  /** Reposition next to current touchpoint / scene anchor */
  const recomputeDock = useCallback(() => {
    if (scene === "hidden" || typeof window === "undefined") return;

    const live =
      Date.now() < interactionUntilRef.current ? interactionRef.current : null;
    const anchor = resolveAssistantAnchor(scene, live);

    const faceOnly = minimized || !openChat;
    const pw = faceOnly ? 72 : Math.min(360, window.innerWidth - 24);
    const ph = faceOnly ? 88 : Math.min(420, window.innerHeight - 24);

    let next: DockRect;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      next = dockNearRect(
        {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          right: r.right,
          bottom: r.bottom,
        },
        pw,
        ph,
        faceOnly ? 10 : 14,
        faceOnly ? ["right", "left", "above", "below"] : ["right", "left", "above", "below"]
      );
    } else {
      // Default: lower-right, above mobile chrome if any
      const onProject = Boolean(projectIdFromPath(pathname));
      next = {
        left: window.innerWidth - pw - 16,
        top: window.innerHeight - ph - (onProject ? 72 : 20),
        placement: "left",
      };
    }

    const prev = prevDockRef.current;
    if (
      prev &&
      (Math.abs(prev.left - next.left) > 24 || Math.abs(prev.top - next.top) > 24)
    ) {
      setTraveling(true);
      window.setTimeout(() => setTraveling(false), 700);
    }
    prevDockRef.current = next;
    setDock(next);
  }, [scene, minimized, openChat, pathname]);

  useLayoutEffect(() => {
    if (!ready || hidden || scene === "hidden") return;
    recomputeDock();

    const onScroll = () => recomputeDock();
    const onResize = () => recomputeDock();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    const interval = window.setInterval(() => {
      // expire interaction + keep dock fresh after layout shifts
      recomputeDock();
    }, 400);

    const mo = new MutationObserver(() => {
      recomputeDock();
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.clearInterval(interval);
      mo.disconnect();
    };
  }, [ready, hidden, scene, recomputeDock]);

  // Soft re-open bubble when scene changes
  useEffect(() => {
    setBubbleOpen(true);
    setOpenChat(false);
  }, [pathname, locale]);

  const fetchGuidance = useCallback(
    async (path: string, q?: string) => {
      const tip = coachTipFromPath(path, locale);
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
        setThread((prev) => [...prev, { id: `you-${Date.now()}`, role: "you", text: q }]);
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
    setOpenChat(true);
    await fetchGuidance(pathname, q);
  }

  if (!ready || seedTip.scene === "hidden" || hidden) return null;

  const activeTip: CoachTip = seedTip;
  const tip = (guidance ?? activeTip) as LiveGuidance | CoachTip;
  const title = "title" in tip ? tip.title : activeTip.title;
  const body = "body" in tip ? tip.body : activeTip.body;
  const ctaLabel = "ctaLabel" in tip ? tip.ctaLabel : activeTip.ctaLabel;
  const ctaTemplate =
    "ctaHrefTemplate" in tip ? tip.ctaHrefTemplate : activeTip.ctaHrefTemplate;
  const ctaHref = resolveCoachCtaHref(
    {
      scene: activeTip.scene,
      title,
      body,
      ctaLabel,
      ctaHrefTemplate: ctaTemplate,
    },
    projectId
  );
  const displayMood: FaroMood = loading || asking ? "thinking" : mood;

  const style: CSSProperties = dock
    ? {
        left: dock.left,
        top: dock.top,
        right: "auto",
        bottom: "auto",
      }
    : {
        right: 16,
        bottom: 20,
        left: "auto",
        top: "auto",
      };

  const lines =
    thread.length > 0
      ? thread
      : [{ id: "seed", role: "faro" as const, text: body, mood: displayMood }];

  // Compact companion: face + optional speech chip that travels
  if (minimized || !openChat) {
    return (
      <div
        ref={panelRef}
        data-faro-assistant
        className={`faro-assistant fixed z-[60] transition-[left,top] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          traveling ? "faro-assistant-traveling" : ""
        }`}
        style={style}
        aria-label={t("coach.open")}
      >
        <div className="relative flex flex-col items-center">
          {/* Living bob */}
          <button
            type="button"
            onClick={() => {
              setOpenChat(true);
              persistMin(false);
              setBubbleOpen(true);
            }}
            className="faro-assistant-bob group relative"
            aria-label={t("coach.open")}
          >
            <FaroPersona
              size={minimized ? 52 : 60}
              mood={displayMood}
              speaking={loading || asking || traveling}
              className="shadow-[var(--shadow-pop)]"
            />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-semibold text-white shadow">
              Faro
            </span>
          </button>

          {bubbleOpen && !minimized ? (
            <div className="faro-assistant-speech mt-3 max-w-[16rem] rounded-2xl rounded-tl-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 shadow-[var(--shadow-card)]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--foreground)] line-clamp-4">
                {loading && !guidance ? t("coach.thinking") : body}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {ctaHref && ctaLabel ? (
                  <Link
                    href={ctaHref}
                    className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-white"
                  >
                    {ctaLabel}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpenChat(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--accent)]"
                >
                  <MessageCircle size={11} /> {t("coach.talkPlaceholder").replace("…", "")}
                </button>
                <button
                  type="button"
                  onClick={() => setBubbleOpen(false)}
                  className="ml-auto text-[10px] text-[var(--subtle)]"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          ) : null}

          {minimized ? (
            <button
              type="button"
              onClick={() => persistMin(false)}
              className="mt-2 text-[10px] text-[var(--subtle)] underline-offset-2 hover:underline"
            >
              {t("coach.open")}
            </button>
          ) : (
            <div className="mt-1.5 flex gap-1">
              <button
                type="button"
                onClick={() => persistMin(true)}
                className="rounded-full px-2 py-0.5 text-[10px] text-[var(--subtle)] hover:bg-[var(--surface)]"
                aria-label={t("coach.minimize")}
              >
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={hideSession}
                className="rounded-full px-2 py-0.5 text-[10px] text-[var(--subtle)] hover:bg-[var(--surface)]"
                aria-label={t("coach.hide")}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full chat panel, still docked to the current touchpoint
  return (
    <aside
      ref={panelRef}
      data-faro-assistant
      className={`faro-assistant fixed z-[60] w-[min(100vw-1.25rem,22.5rem)] transition-[left,top] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        traveling ? "faro-assistant-traveling" : ""
      }`}
      style={style}
      aria-label="Faro, your guide"
    >
      <div className="card-shadow overflow-hidden rounded-[1.35rem] border border-[var(--border-strong)] bg-[var(--surface)]">
        <div className="relative border-b border-[var(--border)] bg-[var(--brand-paper,#F5F1E8)] px-3.5 py-3">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary, #16514B) 14%, transparent) 0%, transparent 55%, color-mix(in srgb, var(--brand-accent, #F25C2A) 10%, transparent) 100%)",
            }}
          />
          <div className="relative flex items-center gap-3">
            <div className="faro-assistant-bob">
              <FaroPersona
                size={52}
                mood={displayMood}
                speaking={loading || asking || traveling}
                className="shadow-md"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg font-medium leading-none tracking-tight text-[var(--foreground)]">
                {FARO_BRAND_PERSONALITY.name}
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{t("coach.role")}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-[var(--accent)]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {FARO_MOOD_LABEL[displayMood]}
                </span>
                <span className="truncate text-[10px] font-medium text-[var(--subtle)]">
                  {title}
                  {loading || asking ? " · …" : traveling ? " · …" : ""}
                </span>
              </div>
            </div>
            <div className="relative flex shrink-0 gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setOpenChat(false);
                  persistMin(false);
                }}
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
        </div>

        <div className="flex max-h-[min(38vh,260px)] flex-col gap-2.5 overflow-y-auto px-3 py-3">
          {lines.map((line) =>
            line.role === "faro" ? (
              <div key={line.id} className="flex items-end gap-2">
                <span className="mb-0.5 hidden shrink-0 sm:inline-flex">
                  <FaroPersonaMini mood={line.mood ?? displayMood} />
                </span>
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm leading-relaxed text-[var(--foreground)]">
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
          <p className="mt-1.5 text-center text-[10px] text-[var(--subtle)]">{t("coach.footer")}</p>
        </div>
      </div>
    </aside>
  );
}

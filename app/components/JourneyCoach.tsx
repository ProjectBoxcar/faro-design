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
  moodForScene,
  moodLabelKey,
  type FaroMood,
} from "@/lib/faro-persona";
import {
  dockNearRect,
  resolveAssistantAnchor,
  type DockRect,
} from "@/lib/faro-assistant-anchors";
import {
  explainElement,
  findExplainTarget,
  hoverContextPayload,
  type HoverExplain,
} from "@/lib/faro-hover-explain";
import { useLocale } from "@/components/LocaleProvider";

const MIN_KEY = "faro-journey-coach-minimized";
const HIDE_KEY = "faro-journey-coach-hidden-session";
/** One-time clear after portrait regression left people with hide stuck on */
const RECOVERY_KEY = "faro-journey-coach-restored-v3";
const INTERACT_MS = 4500;
const HOVER_DWELL_MS = 350;
const HOVER_AI_MS = 550;
/** Dense work stages — keep Faro present but quiet (no speech bubble by default). */
const QUIET_SCENES = new Set(["strategy", "strategy_map", "design", "handover"]);

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
  const [hover, setHover] = useState<HoverExplain | null>(null);
  /** Bump after click-dismiss so Faro re-parks on the scene anchor, not the button. */
  const [parkTick, setParkTick] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const pathKeyRef = useRef("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<HTMLElement | null>(null);
  const interactionUntilRef = useRef(0);
  const prevDockRef = useRef<DockRect | null>(null);
  const hoverKeyRef = useRef("");
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverAiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverAiAbortRef = useRef<AbortController | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  /** After a page click, pause chase-dock so the owner can read/use controls. */
  const suppressFollowUntilRef = useRef(0);

  useEffect(() => {
    try {
      // Recover users who hid Faro during the broken portrait episode
      if (sessionStorage.getItem(RECOVERY_KEY) !== "1") {
        sessionStorage.removeItem(HIDE_KEY);
        sessionStorage.setItem(RECOVERY_KEY, "1");
      }
      setMinimized(localStorage.getItem(MIN_KEY) === "1");
      setHidden(sessionStorage.getItem(HIDE_KEY) === "1");
    } catch {
      /* private mode */
    }
    setReady(true);
  }, []);

  const unhide = useCallback(() => {
    setHidden(false);
    setMinimized(false);
    setOpenChat(false);
    setBubbleOpen(true);
    try {
      sessionStorage.removeItem(HIDE_KEY);
      localStorage.setItem(MIN_KEY, "0");
    } catch {
      /* ignore */
    }
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

  /** Cursor / focus: walk to the control and explain it */
  useEffect(() => {
    if (scene === "hidden" || !ready || hidden) return;

    function applyTarget(el: HTMLElement | null, opts?: { follow?: boolean }) {
      if (!el) {
        hoverKeyRef.current = "";
        setHover(null);
        if (hoverAiTimerRef.current) clearTimeout(hoverAiTimerRef.current);
        hoverAiAbortRef.current?.abort();
        return;
      }
      const exp = explainElement(el, locale, pathname);
      if (!exp) {
        hoverKeyRef.current = "";
        setHover(null);
        if (opts?.follow !== false) {
          interactionRef.current = el;
          interactionUntilRef.current = Date.now() + INTERACT_MS;
        }
        return;
      }
      if (hoverKeyRef.current !== exp.key) {
        hoverKeyRef.current = exp.key;
        setHover(exp);
        // Never auto-open the speech bubble — only the Faro face / Talk control
        // opens it. Hover still updates tip content for when the owner opens Faro.
        if (hoverAiTimerRef.current) clearTimeout(hoverAiTimerRef.current);
        hoverAiAbortRef.current?.abort();
        if (!exp.deep) {
          hoverAiTimerRef.current = setTimeout(() => {
            void enrichHoverWithAi(exp, pathname, locale);
          }, HOVER_AI_MS);
        }
      } else {
        setHover(exp);
      }
      if (opts?.follow !== false) {
        interactionRef.current = exp.el;
        interactionUntilRef.current = Date.now() + INTERACT_MS;
      }
    }

    async function enrichHoverWithAi(
      exp: HoverExplain,
      path: string,
      loc: typeof locale
    ) {
      if (hoverKeyRef.current !== exp.key) return;
      hoverAiAbortRef.current?.abort();
      const ac = new AbortController();
      hoverAiAbortRef.current = ac;
      try {
        const ctx = hoverContextPayload(exp.el, path);
        const res = await fetch("/api/journey-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pathname: path,
            locale: loc,
            mode: "hover",
            hover: ctx,
          }),
          signal: ac.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { title?: string; body?: string; source?: string };
        if (hoverKeyRef.current !== exp.key) return;
        if (data.source === "ai" && data.body?.trim()) {
          setHover({
            ...exp,
            title: data.title?.trim() || exp.title,
            body: data.body.trim(),
            deep: true,
          });
        }
      } catch {
        /* keep local explain */
      }
    }

    function onMove(e: MouseEvent) {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        const { x, y } = lastPointerRef.current;
        // Temporarily ignore Faro so elementFromPoint hits the page under the cursor
        const assistant = document.querySelectorAll("[data-faro-assistant]");
        const prev: string[] = [];
        assistant.forEach((n, i) => {
          if (n instanceof HTMLElement) {
            prev[i] = n.style.pointerEvents;
            n.style.pointerEvents = "none";
          }
        });
        const under = document.elementFromPoint(x, y);
        assistant.forEach((n, i) => {
          if (n instanceof HTMLElement) n.style.pointerEvents = prev[i] ?? "";
        });
        const target = findExplainTarget(under);
        const follow = Date.now() >= suppressFollowUntilRef.current;
        applyTarget(target, { follow });
      }, HOVER_DWELL_MS);
    }

    function onFocusIn(e: FocusEvent) {
      // Focus often follows a click — update tip quietly, do not open bubble or chase.
      const target = findExplainTarget(e.target as Element);
      applyTarget(target, { follow: false });
    }

    function onClick(e: MouseEvent) {
      const t = e.target;
      if (t instanceof Element && t.closest("[data-faro-assistant]")) return;
      // Click = owner is reading/using the UI. Keep Faro closed and out of the way.
      setBubbleOpen(false);
      setOpenChat(false);
      setHover(null);
      hoverKeyRef.current = "";
      interactionRef.current = null;
      interactionUntilRef.current = 0;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (hoverAiTimerRef.current) clearTimeout(hoverAiTimerRef.current);
      hoverAiAbortRef.current?.abort();
      suppressFollowUntilRef.current = Date.now() + 5000;
      setParkTick((n) => n + 1);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("click", onClick, true);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (hoverAiTimerRef.current) clearTimeout(hoverAiTimerRef.current);
      hoverAiAbortRef.current?.abort();
    };
  }, [scene, ready, hidden, locale, pathname]);

  const dockRafRef = useRef(0);

  /** Reposition next to hovered control / scene anchor (rAF-throttled) */
  const recomputeDock = useCallback(() => {
    if (scene === "hidden" || typeof window === "undefined") return;
    if (dockRafRef.current) cancelAnimationFrame(dockRafRef.current);
    dockRafRef.current = requestAnimationFrame(() => {
      const live =
        Date.now() < interactionUntilRef.current ? interactionRef.current : null;
      const anchor = resolveAssistantAnchor(scene, live);

      const faceOnly = minimized || !openChat;
      const pw = faceOnly
        ? bubbleOpen && !minimized
          ? 260
          : 56
        : Math.min(320, window.innerWidth - 24);
      const ph = faceOnly
        ? bubbleOpen && !minimized
          ? 180
          : 72
        : Math.min(380, window.innerHeight - 24);

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
          ["right", "left", "above", "below"]
        );
      } else {
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
    });
  }, [scene, minimized, openChat, pathname, bubbleOpen]);

  useLayoutEffect(() => {
    if (!ready || hidden || scene === "hidden") return;
    recomputeDock();
  }, [hover?.key, ready, hidden, scene, recomputeDock, parkTick]);

  useLayoutEffect(() => {
    if (!ready || hidden || scene === "hidden") return;
    recomputeDock();

    const onScroll = () => recomputeDock();
    const onResize = () => recomputeDock();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    // Light poll only while a live interaction is active (not forever every 400ms)
    const interval = window.setInterval(() => {
      if (Date.now() < interactionUntilRef.current) recomputeDock();
    }, 500);

    const mo = new MutationObserver((mutations) => {
      // Ignore pure attribute noise (class toggles); react to structure changes
      if (mutations.some((m) => m.type === "childList" && m.addedNodes.length > 0)) {
        recomputeDock();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.clearInterval(interval);
      mo.disconnect();
      if (dockRafRef.current) cancelAnimationFrame(dockRafRef.current);
    };
  }, [ready, hidden, scene, recomputeDock]);

  // Re-open bubble on light scenes; stay quiet on Express / Design / Handover
  useEffect(() => {
    setOpenChat(false);
    setBubbleOpen(!QUIET_SCENES.has(scene));
  }, [pathname, locale, scene]);

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

  // Public share / unlock: no owner coach
  if (!ready || seedTip.scene === "hidden") return null;

  // Hidden for session — always leave a corner control so Faro can come back
  if (hidden) {
    return (
      <div
        data-faro-assistant
        className="faro-assistant fixed bottom-5 right-4 z-[9999]"
        style={{ right: 16, bottom: 20 }}
      >
        <button
          type="button"
          onClick={unhide}
          className="faro-assistant-bob group relative"
          aria-label={t("coach.open")}
        >
          <FaroPersona size={36} mood="encouraging" speaking={false} className="shadow-[var(--shadow-pop)]" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-semibold text-white shadow">
            Faro
          </span>
        </button>
      </div>
    );
  }

  const activeTip: CoachTip = seedTip;
  const tip = (guidance ?? activeTip) as LiveGuidance | CoachTip;
  // Cursor-over control wins: Faro explains where you're pointing
  const title = hover?.title ?? ("title" in tip ? tip.title : activeTip.title);
  const body = hover?.body ?? ("body" in tip ? tip.body : activeTip.body);
  const ctaLabel = hover ? undefined : "ctaLabel" in tip ? tip.ctaLabel : activeTip.ctaLabel;
  const ctaTemplate = hover
    ? undefined
    : "ctaHrefTemplate" in tip
      ? tip.ctaHrefTemplate
      : activeTip.ctaHrefTemplate;
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
  const displayMood: FaroMood = loading || asking ? "thinking" : hover ? "encouraging" : mood;

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
        className={`faro-assistant fixed z-[9999] ${
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
              size={minimized ? 36 : 40}
              mood={displayMood}
              speaking={loading || asking || traveling}
              className="shadow-[var(--shadow-pop)]"
            />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-semibold text-white shadow">
              Faro
            </span>
          </button>

          {bubbleOpen && !minimized ? (
            <div
              className={`faro-assistant-speech mt-3 max-w-[16.5rem] rounded-xl rounded-tl-md border bg-[var(--surface)] px-3 py-2.5 shadow-[var(--shadow-card)] ${
                hover
                  ? "border-[var(--accent)]/40 ring-1 ring-[var(--accent)]/15"
                  : "border-[var(--border-strong)]"
              }`}
            >
              {hover ? (
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                  {t("coach.pointing")}
                </p>
              ) : null}
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--foreground)] line-clamp-5">
                {loading && !guidance && !hover ? t("coach.thinking") : body}
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
      className={`faro-assistant fixed z-[9999] w-[min(100vw-1.25rem,18rem)] ${
        traveling ? "faro-assistant-traveling" : ""
      }`}
      style={style}
      aria-label={t("coach.openChatAria")}
    >
      <div className="card-shadow overflow-hidden rounded-[1.35rem] border border-[var(--border-strong)] bg-[var(--surface)]">
        <div className="relative border-b border-[var(--border)] bg-[var(--brand-paper,#F5F1E8)] px-3 py-2.5">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary, #16514B) 14%, transparent) 0%, transparent 55%, color-mix(in srgb, var(--brand-accent, #F25C2A) 10%, transparent) 100%)",
            }}
          />
          <div className="relative flex items-center gap-2.5">
            <div className="faro-assistant-bob">
              <FaroPersona
                size={36}
                mood={displayMood}
                speaking={loading || asking || traveling}
                className="shadow-md"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-sm font-medium leading-none tracking-tight text-[var(--foreground)]">
                {FARO_BRAND_PERSONALITY.name}
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{t("coach.role")}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-[var(--accent)]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {t(moodLabelKey(displayMood))}
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
                <div className="max-w-[92%] rounded-xl rounded-bl-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm leading-relaxed text-[var(--foreground)]">
                  {line.text}
                </div>
              </div>
            ) : (
              <div key={line.id} className="flex justify-end">
                <div className="max-w-[88%] rounded-xl rounded-br-md bg-[var(--accent)] px-3 py-2.5 text-sm leading-relaxed text-white">
                  {line.text}
                </div>
              </div>
            )
          )}
          {(loading || asking) && (
            <div className="flex items-end gap-2">
              <span className="mb-0.5 hidden h-7 w-7 shrink-0 sm:block" />
              <div className="inline-flex items-center gap-1.5 rounded-xl rounded-bl-md bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
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
              className="min-w-0 flex-1 rounded-full border border-[var(--border-strong)] bg-[var(--field)] px-3 py-1.5 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--subtle)] focus:border-[var(--accent)]"
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

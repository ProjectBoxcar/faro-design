"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  MessageCircle,
  PhoneOff,
  Send,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { FaroPersona } from "@/components/FaroPersona";
import { FaroCallAgenda } from "@/components/faro-call/FaroCallAgenda";
import { FaroCallStage } from "@/components/faro-call/FaroCallStage";
import {
  tryAnswerCallQuestion,
  sanitizeSpokenText,
  callGuideUnavailableMessage,
} from "@/lib/faro-call/call-answers";
import { canSpeak, speakText, stopSpeaking } from "@/lib/faro-call/speech";
import type { CallStageId, FaroCallContext } from "@/lib/faro-call/types";
import { useLocale } from "@/components/LocaleProvider";

type ChatTurn = { role: "user" | "faro"; text: string };

export function FaroCallShell({ ctx }: { ctx: FaroCallContext }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [beatIndex, setBeatIndex] = useState(ctx.startBeatIndex);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [captionsOnly, setCaptionsOnly] = useState(false);
  const [reply, setReply] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [liveCaption, setLiveCaption] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatTurn[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [stageKey, setStageKey] = useState(0);
  const [softWelcome, setSoftWelcome] = useState(ctx.startBeatIndex > 0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const cancelSpeech = useRef<(() => void) | null>(null);
  const threadEndRef = useRef<HTMLLIElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const askBtnRef = useRef<HTMLButtonElement | null>(null);
  const askGen = useRef(0);
  const askAbort = useRef<AbortController | null>(null);
  const skipBeatSpeech = useRef(false);

  const beat = ctx.beats[beatIndex] ?? ctx.beats[0];
  const isFirst = beatIndex <= 0;
  const isLast = beatIndex >= ctx.beats.length - 1;

  const stop = useCallback(() => {
    cancelSpeech.current?.();
    cancelSpeech.current = null;
    stopSpeaking();
    setSpeaking(false);
  }, []);

  const playLine = useCallback(
    (
      text: string,
      opts?: { ignoreMute?: boolean; langOverride?: string }
    ) => {
      stop();
      const clean = sanitizeSpokenText(text);
      if (!clean) {
        setSpeaking(false);
        return;
      }
      if (!opts?.ignoreMute && (muted || captionsOnly || !canSpeak())) {
        setSpeaking(false);
        return;
      }
      if (opts?.ignoreMute && (captionsOnly || !canSpeak())) {
        setSpeaking(false);
        return;
      }
      const lang = opts?.langOverride ?? (locale === "es" ? "es-ES" : "en-US");
      setSpeaking(true);
      cancelSpeech.current = speakText(clean, {
        lang,
        onEnd: () => setSpeaking(false),
        onError: () => {
          setCaptionsOnly(true);
          setSpeaking(false);
        },
      });
    },
    [captionsOnly, locale, muted, stop]
  );

  // Hydration-safe TTS probe
  useEffect(() => {
    setCaptionsOnly(!canSpeak());
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Inert project chrome under the call overlay
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-project-chrome]");
    nodes.forEach((el) => {
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
    });
    return () => {
      nodes.forEach((el) => {
        el.inert = false;
        el.removeAttribute("aria-hidden");
      });
    };
  }, []);

  useEffect(() => {
    askAbort.current?.abort();
    askAbort.current = null;
    askGen.current += 1;
    setStageKey((k) => k + 1);
    if (skipBeatSpeech.current) {
      skipBeatSpeech.current = false;
      return () => stop();
    }
    setLiveCaption(null);
    playLine(beat.line, { langOverride: locale === "es" ? "es-ES" : "en-US" });
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on beat id
  }, [beat.id, locale]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (!chatOpen) return;
    threadEndRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [thread, askBusy, chatOpen, reduceMotion]);

  useEffect(() => {
    if (!chatOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setChatOpen(false);
        setTimeout(() => askBtnRef.current?.focus(), 0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatOpen]);

  function next() {
    setSoftWelcome(false);
    setLiveCaption(null);
    if (isLast) {
      stop();
      router.push(`/projects/${ctx.projectId}`);
      return;
    }
    setBeatIndex((i) => Math.min(i + 1, ctx.beats.length - 1));
  }

  function previous() {
    if (isFirst) return;
    setSoftWelcome(false);
    setLiveCaption(null);
    setBeatIndex((i) => Math.max(i - 1, 0));
  }

  function jumpStage(stageId: CallStageId) {
    if (askBusy) {
      askAbort.current?.abort();
      askAbort.current = null;
      askGen.current += 1;
      setAskBusy(false);
    }
    const idx = ctx.beats.findIndex((b) => b.stageId === stageId && b.id !== "welcome");
    if (idx >= 0) {
      setSoftWelcome(false);
      setLiveCaption(null);
      setBeatIndex(idx);
    }
  }

  function openChat() {
    setChatOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closeChat() {
    setChatOpen(false);
    setTimeout(() => askBtnRef.current?.focus(), 0);
  }

  async function askFaro(preset?: string) {
    const q = (preset ?? reply).trim();
    if (!q || askBusy) return;
    setChatOpen(true);
    setSoftWelcome(false);
    setAskBusy(true);
    setThread((t) => [...t, { role: "user", text: q }]);
    setReply("");
    setLiveCaption(t("call.thinking"));

    const gen = ++askGen.current;
    askAbort.current?.abort();
    const ac = new AbortController();
    askAbort.current = ac;

    try {
      const quick = tryAnswerCallQuestion(q, ctx, locale);
      if (quick) {
        if (gen !== askGen.current) return;
        const answer = sanitizeSpokenText(quick.text);
        setThread((tr) => [...tr, { role: "faro", text: answer }]);
        setLiveCaption(answer);
        if (quick.jumpStageId) {
          const idx = ctx.beats.findIndex(
            (b) => b.stageId === quick.jumpStageId && b.id !== "welcome"
          );
          if (idx >= 0 && idx !== beatIndex) {
            skipBeatSpeech.current = true;
            setBeatIndex(idx);
          }
        }
        playLine(answer, {
          langOverride: locale === "es" ? "es-ES" : "en-US",
        });
        return;
      }

      const res = await fetch("/api/journey-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          pathname: `/projects/${ctx.projectId}/call`,
          question: q,
          locale,
          mode: "call",
        }),
      });
      if (gen !== askGen.current) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Coach unavailable");
      }

      const softFail =
        data.source === "fallback" || data.aiAvailable === false || !String(data.body ?? "").trim();
      const answer = sanitizeSpokenText(
        softFail
          ? callGuideUnavailableMessage(locale)
          : typeof data.body === "string" && data.body.trim()
            ? data.body.trim()
            : t("call.failEmpty")
      );
      setThread((tr) => [...tr, { role: "faro", text: answer }]);
      setLiveCaption(answer);
      playLine(answer, {
        langOverride: locale === "es" ? "es-ES" : "en-US",
      });
    } catch (err) {
      if (ac.signal.aborted || gen !== askGen.current) return;
      const fail = t("call.failNetwork");
      setThread((tr) => [...tr, { role: "faro", text: fail }]);
      setLiveCaption(fail);
      playLine(fail, { langOverride: locale === "es" ? "es-ES" : "en-US" });
    } finally {
      if (gen === askGen.current) setAskBusy(false);
    }
  }

  const progressLabel = useMemo(
    () => `${beatIndex + 1} / ${ctx.beats.length}`,
    [beatIndex, ctx.beats.length]
  );

  const captionText = softWelcome
    ? t("call.softWelcome")
    : (liveCaption ?? beat.line);
  const faroMood = speaking ? "encouraging" : askBusy ? "thinking" : "calm";
  const faroStatus = speaking
    ? t("call.speaking")
    : askBusy
      ? t("call.thinking")
      : t("call.onCall");

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0a0f0d] text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {!reduceMotion ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ok)] opacity-40" />
              ) : null}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ok)]" />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
              {t("call.live")}
            </p>
            <span className="hidden tabular-nums text-[10px] text-white/55 sm:inline">
              · {progressLabel}
            </span>
          </div>
          <h1 className="mt-0.5 truncate font-serif text-base font-medium tracking-tight text-white/95 sm:text-lg">
            {ctx.projectName}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              const nextMuted = !muted;
              setMuted(nextMuted);
              if (nextMuted) stop();
              else playLine(captionText, { langOverride: liveCaption && locale === "es" ? "es-ES" : "en-US" });
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/80 transition hover:bg-white/14"
            aria-pressed={muted}
            aria-label={muted ? t("call.unmute") : t("call.mute")}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            ref={askBtnRef}
            type="button"
            onClick={() => {
              if (chatOpen) closeChat();
              else openChat();
            }}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
              chatOpen ? "bg-white/18 text-white" : "bg-white/8 text-white/80 hover:bg-white/14"
            }`}
            aria-pressed={chatOpen}
            aria-expanded={chatOpen}
            aria-controls="faro-call-chat"
            aria-label={t("call.ask")}
          >
            <MessageCircle size={14} aria-hidden />
            {t("call.ask")}
            {thread.length > 0 ? (
              <span className="rounded-full bg-white/20 px-1.5 text-[10px] tabular-nums">
                {Math.ceil(thread.length / 2)}
              </span>
            ) : null}
          </button>
          <Link
            href={`/projects/${ctx.projectId}`}
            onClick={() => stop()}
            aria-label={t("call.leaveAria")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#c0392b] px-3 text-xs font-semibold text-white transition hover:bg-[#a93226] sm:px-3.5"
          >
            <PhoneOff size={14} aria-hidden />
            <span className="hidden sm:inline">{t("call.leave")}</span>
          </Link>
        </div>
      </header>

      <div className="shrink-0 px-4 pb-2 sm:px-5">
        <FaroCallAgenda
          agenda={ctx.agenda}
          activeStageId={beat.stageId}
          onJump={jumpStage}
          disabled={askBusy}
        />
      </div>

      <div className="relative min-h-0 flex-1 px-4 sm:px-5">
        <div key={stageKey} className="faro-call-stage-enter h-full">
          <FaroCallStage media={beat.media} />
        </div>

        <div className="absolute bottom-3 right-5 z-20 hidden w-[8.75rem] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#15201c]/95 shadow-[0_12px_40px_rgba(0,0,0,.45)] backdrop-blur-md sm:flex">
          <div className="flex flex-col items-center gap-1 px-3 pb-2 pt-2.5">
            <div
              className={`transition-transform duration-300 ${
                speaking && !reduceMotion ? "scale-105" : "scale-100"
              }`}
            >
              <FaroPersona size={60} mood={faroMood} speaking={speaking || askBusy} />
            </div>
            <p className="text-[11px] font-medium text-white/90">Faro</p>
            <p className="text-[9px] uppercase tracking-wider text-white/55">{faroStatus}</p>
          </div>
        </div>

        <div className="absolute right-5 top-3 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-[#15201c]/95 px-2 py-1.5 shadow-lg backdrop-blur-md sm:hidden">
          <FaroPersona size={32} mood={faroMood} speaking={speaking || askBusy} />
          <span className="pr-1 text-[10px] font-medium text-white/80">{faroStatus}</span>
        </div>

        {chatOpen ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-30 bg-black/40 sm:bg-black/25"
              aria-label={t("call.closeChat")}
              onClick={closeChat}
            />
            <aside
              id="faro-call-chat"
              role="dialog"
              aria-modal="true"
              aria-label={t("call.askTitle")}
              className="absolute inset-x-0 bottom-0 z-40 flex max-h-[min(58vh,26rem)] flex-col rounded-t-2xl border border-white/12 bg-[#101816] shadow-[0_-12px_48px_rgba(0,0,0,.5)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[22rem] sm:rounded-none sm:rounded-l-2xl sm:border-y-0 sm:border-r-0"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
                    {t("call.askTitle")}
                  </p>
                  <p className="text-xs text-white/55">{t("call.askSubtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={closeChat}
                  className="rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
                  aria-label={t("call.closeChat")}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {thread.length === 0 ? (
                  <div className="space-y-2 px-1 py-2">
                    <p className="text-[11px] leading-relaxed text-white/55">{t("call.askHint")}</p>
                    {[t("call.hintLogo"), t("call.hintLeft")].map((hint) => (
                      <button
                        key={hint}
                        type="button"
                        onClick={() => void askFaro(hint)}
                        className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {thread.map((turn, i) => (
                      <li
                        key={`${turn.role}-${i}`}
                        className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          turn.role === "user"
                            ? "ml-6 bg-[var(--accent)]/30 text-white/90"
                            : "mr-4 bg-white/8 text-white/85"
                        }`}
                      >
                        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wider text-white/45">
                          {turn.role === "user" ? "You" : "Faro"}
                        </span>
                        {turn.text}
                      </li>
                    ))}
                    {askBusy ? (
                      <li className="mr-4 flex items-center gap-1.5 rounded-xl bg-white/8 px-3 py-2 text-xs text-white/50">
                        <Loader2 size={12} className="animate-spin" aria-hidden /> {t("call.thinking")}
                      </li>
                    ) : null}
                    <li ref={threadEndRef} />
                  </ul>
                )}
              </div>

              <div className="shrink-0 border-t border-white/10 p-3">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void askFaro()}
                    placeholder={t("call.placeholder")}
                    disabled={askBusy}
                    className="min-w-0 flex-1 rounded-full border border-white/12 bg-black/30 px-3.5 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={askBusy || !reply.trim()}
                    onClick={() => void askFaro()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white disabled:opacity-40"
                    aria-label={t("call.send")}
                  >
                    {askBusy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
              </div>
            </aside>
          </>
        ) : null}
      </div>

      <div
        className="shrink-0 border-t border-white/10 bg-[#0c1210]/95 px-4 py-3 backdrop-blur-md sm:px-5"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div
            className="min-w-0 flex-1"
            aria-live="polite"
            aria-atomic="true"
            aria-busy={askBusy}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/55">
              {softWelcome
                ? t("call.live")
                : liveCaption
                  ? t("call.answered")
                  : t("call.saying")}
              {captionsOnly ? ` · ${t("call.captionsOnly")}` : ""}
            </p>
            <p className="mt-1 max-h-24 overflow-y-auto text-sm leading-relaxed text-white/90 sm:text-[15px]">
              {captionText}
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={previous}
              disabled={isFirst || askBusy}
              className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <ChevronLeft size={14} aria-hidden />
              {t("call.previous")}
            </button>
            <button
              type="button"
              onClick={() => {
                setSoftWelcome(false);
                // Explicit Replay speaks even while muted
                playLine(liveCaption ?? beat.line, {
                  ignoreMute: true,
                  langOverride: liveCaption && locale === "es" ? "es-ES" : "en-US",
                });
              }}
              className="rounded-full border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {t("call.replay")}
            </button>
            <button
              type="button"
              onClick={next}
              disabled={askBusy}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0a0f0d] transition hover:bg-white/90 disabled:opacity-50"
            >
              {isLast ? t("call.endCall") : t("call.continue")}
              <SkipForward size={15} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

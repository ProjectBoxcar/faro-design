"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
import { tryAnswerCallQuestion, sanitizeSpokenText } from "@/lib/faro-call/call-answers";
import { canSpeak, speakText, stopSpeaking } from "@/lib/faro-call/speech";
import type { CallStageId, FaroCallContext } from "@/lib/faro-call/types";
import { useLocale } from "@/components/LocaleProvider";

type ChatTurn = { role: "user" | "faro"; text: string };

export function FaroCallShell({ ctx }: { ctx: FaroCallContext }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [beatIndex, setBeatIndex] = useState(ctx.startBeatIndex);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [captionsOnly, setCaptionsOnly] = useState(!canSpeak());
  const [reply, setReply] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [liveCaption, setLiveCaption] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatTurn[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [stageKey, setStageKey] = useState(0);
  const cancelSpeech = useRef<(() => void) | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const beat = ctx.beats[beatIndex] ?? ctx.beats[0];
  const isLast = beatIndex >= ctx.beats.length - 1;
  const lang = locale === "es" ? "es-ES" : "en-US";

  const stop = useCallback(() => {
    cancelSpeech.current?.();
    cancelSpeech.current = null;
    stopSpeaking();
    setSpeaking(false);
  }, []);

  const playLine = useCallback(
    (text: string) => {
      stop();
      const clean = sanitizeSpokenText(text);
      if (!clean) {
        setSpeaking(false);
        return;
      }
      if (muted || captionsOnly || !canSpeak()) {
        setSpeaking(false);
        return;
      }
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
    [captionsOnly, lang, muted, stop]
  );

  useEffect(() => {
    setLiveCaption(null);
    setStageKey((k) => k + 1);
    playLine(beat.line);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on beat id
  }, [beat.id]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, askBusy, chatOpen]);

  function next() {
    setLiveCaption(null);
    if (isLast) {
      stop();
      router.push(`/projects/${ctx.projectId}`);
      return;
    }
    setBeatIndex((i) => Math.min(i + 1, ctx.beats.length - 1));
  }

  function jumpStage(stageId: CallStageId) {
    const idx = ctx.beats.findIndex((b) => b.stageId === stageId && b.id !== "welcome");
    if (idx >= 0) {
      setLiveCaption(null);
      setBeatIndex(idx);
    }
  }

  function openChat() {
    setChatOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function askFaro() {
    const q = reply.trim();
    if (!q || askBusy) return;
    setChatOpen(true);
    setAskBusy(true);
    setThread((t) => [...t, { role: "user", text: q }]);
    setReply("");
    setLiveCaption("Thinking…");

    try {
      const quick = tryAnswerCallQuestion(q, ctx);
      if (quick) {
        const answer = sanitizeSpokenText(quick);
        setThread((t) => [...t, { role: "faro", text: answer }]);
        setLiveCaption(answer);
        playLine(answer);
        return;
      }

      const res = await fetch("/api/journey-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: `/projects/${ctx.projectId}/call`,
          question: q,
          locale,
          mode: "call",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Coach unavailable");
      }
      const answer = sanitizeSpokenText(
        typeof data.body === "string" && data.body.trim()
          ? data.body.trim()
          : "I don't have a clear answer yet. Check Settings for your strategy AI key, then ask again."
      );
      setThread((t) => [...t, { role: "faro", text: answer }]);
      setLiveCaption(answer);
      playLine(answer);
    } catch {
      const fail = "I couldn't reach the guide just now. Check your connection and try again.";
      setThread((t) => [...t, { role: "faro", text: fail }]);
      setLiveCaption(fail);
    } finally {
      setAskBusy(false);
    }
  }

  const progressLabel = useMemo(
    () => `${beatIndex + 1} / ${ctx.beats.length}`,
    [beatIndex, ctx.beats.length]
  );

  const captionText = liveCaption ?? beat.line;
  const faroMood = speaking ? "encouraging" : askBusy ? "thinking" : "calm";
  const faroStatus = speaking ? "Speaking" : askBusy ? "Thinking" : "On call";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0a0f0d] text-white">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ok)] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ok)]" />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Faro Call · live
            </p>
            <span className="hidden tabular-nums text-[10px] text-white/30 sm:inline">
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
              else playLine(captionText);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/80 transition hover:bg-white/14"
            aria-pressed={muted}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (chatOpen) setChatOpen(false);
              else openChat();
            }}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
              chatOpen ? "bg-white/18 text-white" : "bg-white/8 text-white/80 hover:bg-white/14"
            }`}
            aria-pressed={chatOpen}
          >
            <MessageCircle size={14} />
            Ask
            {thread.length > 0 ? (
              <span className="rounded-full bg-white/20 px-1.5 text-[10px] tabular-nums">
                {Math.ceil(thread.length / 2)}
              </span>
            ) : null}
          </button>
          <Link
            href={`/projects/${ctx.projectId}`}
            onClick={() => stop()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#c0392b] px-3 text-xs font-semibold text-white transition hover:bg-[#a93226] sm:px-3.5"
          >
            <PhoneOff size={14} />
            <span className="hidden sm:inline">Leave</span>
          </Link>
        </div>
      </header>

      {/* Agenda strip */}
      <div className="shrink-0 px-4 pb-2 sm:px-5">
        <FaroCallAgenda agenda={ctx.agenda} activeStageId={beat.stageId} onJump={jumpStage} />
      </div>

      {/* Stage + overlays */}
      <div className="relative min-h-0 flex-1 px-4 sm:px-5">
        <div key={stageKey} className="faro-call-stage-enter h-full">
          <FaroCallStage media={beat.media} />
        </div>

        {/* Faro PiP — desktop */}
        <div className="absolute bottom-3 right-5 z-20 hidden w-[8.75rem] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#15201c]/95 shadow-[0_12px_40px_rgba(0,0,0,.45)] backdrop-blur-md sm:flex">
          <div className="flex flex-col items-center gap-1 px-3 pb-2 pt-2.5">
            <div className={`transition-transform duration-300 ${speaking ? "scale-105" : "scale-100"}`}>
              <FaroPersona size={60} mood={faroMood} speaking={speaking || askBusy} />
            </div>
            <p className="text-[11px] font-medium text-white/90">Faro</p>
            <p className="text-[9px] uppercase tracking-wider text-white/40">{faroStatus}</p>
          </div>
        </div>

        {/* Faro chip — mobile */}
        <div className="absolute right-5 top-3 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-[#15201c]/95 px-2 py-1.5 shadow-lg backdrop-blur-md sm:hidden">
          <FaroPersona size={32} mood={faroMood} speaking={speaking || askBusy} />
          <span className="pr-1 text-[10px] font-medium text-white/80">
            {speaking ? "Speaking" : askBusy ? "Thinking" : "Faro"}
          </span>
        </div>

        {/* Chat slide-over */}
        {chatOpen ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-30 bg-black/40 sm:bg-black/25"
              aria-label="Close chat"
              onClick={() => setChatOpen(false)}
            />
            <aside className="absolute inset-x-0 bottom-0 z-40 flex max-h-[min(58vh,26rem)] flex-col rounded-t-2xl border border-white/12 bg-[#101816] shadow-[0_-12px_48px_rgba(0,0,0,.5)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[22rem] sm:rounded-none sm:rounded-l-2xl sm:border-y-0 sm:border-r-0">
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    Ask Faro
                  </p>
                  <p className="text-xs text-white/55">Questions about this walkthrough</p>
                </div>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close chat"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {thread.length === 0 ? (
                  <div className="space-y-2 px-1 py-2">
                    <p className="text-[11px] leading-relaxed text-white/40">
                      Ask about assets, package status, or what’s next.
                    </p>
                    {["Do we have a logo?", "What’s left before handover?"].map((hint) => (
                      <button
                        key={hint}
                        type="button"
                        onClick={() => {
                          setReply(hint);
                          setTimeout(() => inputRef.current?.focus(), 0);
                        }}
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
                        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wider text-white/35">
                          {turn.role === "user" ? "You" : "Faro"}
                        </span>
                        {turn.text}
                      </li>
                    ))}
                    {askBusy ? (
                      <li className="mr-4 flex items-center gap-1.5 rounded-xl bg-white/8 px-3 py-2 text-xs text-white/50">
                        <Loader2 size={12} className="animate-spin" /> Thinking…
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
                    placeholder="Ask about logo, package, what’s next…"
                    disabled={askBusy}
                    className="min-w-0 flex-1 rounded-full border border-white/12 bg-black/30 px-3.5 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={askBusy || !reply.trim()}
                    onClick={() => void askFaro()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white disabled:opacity-40"
                    aria-label="Send question"
                  >
                    {askBusy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
              </div>
            </aside>
          </>
        ) : null}
      </div>

      {/* Caption + controls dock */}
      <div className="shrink-0 border-t border-white/10 bg-[#0c1210]/95 px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">
              {liveCaption ? "Faro answered" : "Faro is saying"}
              {captionsOnly ? " · captions only" : ""}
            </p>
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-white/90 sm:text-[15px]">
              {captionText}
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => playLine(captionText)}
              className="rounded-full border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Replay
            </button>
            <button
              type="button"
              onClick={next}
              disabled={askBusy}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0a0f0d] transition hover:bg-white/90 disabled:opacity-50"
            >
              {isLast ? "End call" : "Continue"}
              <SkipForward size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

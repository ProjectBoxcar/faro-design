"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  PhoneOff,
  Send,
  SkipForward,
  Volume2,
  VolumeX,
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
  /** When set, captions show this instead of the walkthrough line */
  const [liveCaption, setLiveCaption] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatTurn[]>([]);
  const [stageKey, setStageKey] = useState(0);
  const cancelSpeech = useRef<(() => void) | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const beat = ctx.beats[beatIndex] ?? ctx.beats[0];
  const isLast = beatIndex >= ctx.beats.length - 1;
  const lang = locale === "es" ? "es-ES" : "en-US";

  const stop = useCallback(() => {
    cancelSpeech.current?.();
    cancelSpeech.current = null;
    stopSpeaking();
    setSpeaking(false);
  }, []);

  /** Speak without clearing captions/chat. */
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

  // Speak walkthrough beat when it changes (not when answering chat)
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
  }, [thread, askBusy]);

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

  async function askFaro() {
    const q = reply.trim();
    if (!q || askBusy) return;
    setAskBusy(true);
    setThread((t) => [...t, { role: "user", text: q }]);
    setReply("");
    setLiveCaption("Thinking…");

    try {
      // Instant factual answers for common status questions
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

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
            Faro Call
          </p>
          <h1 className="truncate font-serif text-base font-medium tracking-tight sm:text-lg">
            {ctx.projectName}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden text-[10px] tabular-nums text-[var(--subtle)] sm:inline">
            {progressLabel}
          </span>
          <button
            type="button"
            onClick={() => {
              const nextMuted = !muted;
              setMuted(nextMuted);
              if (nextMuted) stop();
              else playLine(captionText);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--border-strong)] px-2.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)]"
            aria-pressed={muted}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span className="hidden sm:inline">{muted ? "Unmute" : "Mute"}</span>
          </button>
          <Link
            href={`/projects/${ctx.projectId}`}
            onClick={() => stop()}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-[var(--danger)] px-3 text-xs font-semibold text-white hover:opacity-90"
          >
            <PhoneOff size={14} /> Leave
          </Link>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(16rem,0.9fr)_minmax(0,1.3fr)_12.5rem] lg:p-4">
        {/* Faro + chat */}
        <section className="flex min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--brand-paper,#F5F1E8)_88%,#16514B)] p-3 sm:p-4">
          <div className="flex flex-col items-center gap-2 py-2">
            <div className={`transition-transform duration-300 ${speaking ? "scale-105" : "scale-100"}`}>
              <FaroPersona
                size={100}
                mood={speaking ? "encouraging" : askBusy ? "thinking" : "calm"}
                speaking={speaking || askBusy}
                className="shadow-[var(--shadow-pop)]"
              />
            </div>
            <p className="font-serif text-sm font-medium tracking-tight">Faro</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
              {speaking ? "Speaking…" : askBusy ? "Thinking…" : "On call"}
            </p>
          </div>

          {/* Captions — current spoken line */}
          <div
            key={liveCaption ? `live-${liveCaption.slice(0, 24)}` : `beat-${beat.id}`}
            className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-2.5 transition-opacity duration-200"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
              {liveCaption ? "Answer" : "Now saying"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--foreground)]">{captionText}</p>
            {captionsOnly ? (
              <p className="mt-1 text-[10px] text-[var(--subtle)]">Voice unavailable — captions only.</p>
            ) : null}
          </div>

          {/* Chat thread */}
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]/70 px-2 py-2">
            {thread.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-[var(--subtle)]">
                Ask about logo, package, what&apos;s left, or the next step — I&apos;ll answer clearly.
              </p>
            ) : (
              <ul className="space-y-2">
                {thread.map((turn, i) => (
                  <li
                    key={`${turn.role}-${i}`}
                    className={`rounded-lg px-2.5 py-1.5 text-xs leading-relaxed ${
                      turn.role === "user"
                        ? "ml-6 bg-[var(--accent-soft)] text-[var(--foreground)]"
                        : "mr-4 bg-[var(--surface-2)] text-[var(--foreground)]"
                    }`}
                  >
                    <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                      {turn.role === "user" ? "You" : "Faro"}
                    </span>
                    {turn.text}
                  </li>
                ))}
                {askBusy ? (
                  <li className="mr-4 flex items-center gap-1.5 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--muted)]">
                    <Loader2 size={12} className="animate-spin" /> Thinking…
                  </li>
                ) : null}
                <li ref={threadEndRef} />
              </ul>
            )}
          </div>

          <div className="mt-2 flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void askFaro()}
              placeholder="Ask Faro something…"
              disabled={askBusy}
              className="min-w-0 flex-1 rounded-full border border-[var(--border-strong)] bg-[var(--field)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)] disabled:opacity-60"
            />
            <button
              type="button"
              disabled={askBusy || !reply.trim()}
              onClick={() => void askFaro()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white disabled:opacity-40"
              aria-label="Send question"
            >
              {askBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </section>

        {/* Shared stage with soft remount fade */}
        <section className="min-h-[36vh] lg:min-h-0">
          <div key={stageKey} className="faro-call-stage-enter h-full">
            <FaroCallStage media={beat.media} />
          </div>
        </section>

        <aside className="hidden min-h-0 overflow-y-auto lg:block">
          <FaroCallAgenda agenda={ctx.agenda} activeStageId={beat.stageId} onJump={jumpStage} />
        </aside>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] px-3 py-2.5 sm:px-4">
        <Link
          href={`/projects/${ctx.projectId}`}
          onClick={() => stop()}
          className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={14} /> Project hub
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => playLine(captionText)}
            className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={next}
            disabled={askBusy}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {isLast ? "End call" : "Continue"}
            <SkipForward size={14} />
          </button>
        </div>
      </footer>

    </div>
  );
}

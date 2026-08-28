"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { FaroPersona } from "@/components/FaroPersona";
import { FaroCallAgenda } from "@/components/faro-call/FaroCallAgenda";
import { FaroCallStage } from "@/components/faro-call/FaroCallStage";
import { canSpeak, speakText, stopSpeaking } from "@/lib/faro-call/speech";
import type { CallStageId, FaroCallContext } from "@/lib/faro-call/types";
import { useLocale } from "@/components/LocaleProvider";

export function FaroCallShell({ ctx }: { ctx: FaroCallContext }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [beatIndex, setBeatIndex] = useState(ctx.startBeatIndex);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [captionsOnly, setCaptionsOnly] = useState(!canSpeak());
  const [reply, setReply] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const cancelSpeech = useRef<(() => void) | null>(null);

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
      setAskAnswer(null);
      if (muted || captionsOnly || !canSpeak()) {
        setSpeaking(false);
        return;
      }
      setSpeaking(true);
      cancelSpeech.current = speakText(text, {
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

  // Speak when beat changes
  useEffect(() => {
    playLine(beat.line);
    return () => stop();
  }, [beat.id]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional on beat id

  useEffect(() => {
    return () => stop();
  }, [stop]);

  function next() {
    if (isLast) {
      router.push(`/projects/${ctx.projectId}`);
      return;
    }
    setBeatIndex((i) => Math.min(i + 1, ctx.beats.length - 1));
  }

  function jumpStage(stageId: CallStageId) {
    const idx = ctx.beats.findIndex((b) => b.stageId === stageId && b.id !== "welcome");
    if (idx >= 0) setBeatIndex(idx);
  }

  async function askFaro() {
    const q = reply.trim();
    if (!q || askBusy) return;
    setAskBusy(true);
    setAskAnswer(null);
    try {
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
        throw new Error(
          typeof data.error === "string" ? data.error : "Coach unavailable"
        );
      }
      // Speak the answer body only — never title/JSON fluff.
      const answer =
        typeof data.body === "string" && data.body.trim()
          ? data.body.trim()
          : "I don't have a clear answer yet — check that your strategy AI key is in Settings, then ask again.";
      setAskAnswer(answer);
      setReply("");
      if (!muted && !captionsOnly) playLine(answer);
    } catch {
      setAskAnswer("Connection issue — check the network and try again.");
    } finally {
      setAskBusy(false);
    }
  }

  const progressLabel = useMemo(
    () => `${beatIndex + 1} / ${ctx.beats.length}`,
    [beatIndex, ctx.beats.length]
  );

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Top bar */}
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
              else playLine(beat.line);
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

      {/* Body */}
      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_12rem] lg:p-4">
        {/* Faro camera */}
        <section className="flex min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--brand-paper,#F5F1E8)_88%,#16514B)] p-4">
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="faro-assistant-bob">
              <FaroPersona
                size={120}
                mood={speaking ? "encouraging" : askBusy ? "thinking" : "calm"}
                speaking={speaking || askBusy}
                className="shadow-[var(--shadow-pop)]"
              />
            </div>
            <p className="font-serif text-sm font-medium tracking-tight">Faro</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
              {speaking ? "Speaking…" : askBusy ? "Listening…" : "On call"}
            </p>
          </div>

          {/* Captions */}
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
              Captions
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--foreground)]">
              {askAnswer ?? beat.line}
            </p>
            {captionsOnly ? (
              <p className="mt-1 text-[10px] text-[var(--subtle)]">
                Voice unavailable — captions only.
              </p>
            ) : null}
          </div>

          {/* Reply */}
          <div className="mt-2 flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void askFaro()}
              placeholder="Ask Faro something…"
              className="min-w-0 flex-1 rounded-full border border-[var(--border-strong)] bg-[var(--field)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              disabled={askBusy || !reply.trim()}
              onClick={() => void askFaro()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white disabled:opacity-40"
              aria-label="Send question"
            >
              {askBusy ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          </div>
        </section>

        {/* Shared stage */}
        <section className="min-h-[40vh] lg:min-h-0">
          <FaroCallStage media={beat.media} />
        </section>

        {/* Agenda */}
        <aside className="hidden min-h-0 lg:block">
          <FaroCallAgenda agenda={ctx.agenda} activeStageId={beat.stageId} onJump={jumpStage} />
        </aside>
      </div>

      {/* Controls */}
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
            onClick={() => playLine(askAnswer ?? beat.line)}
            className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            {isLast ? "End call" : "Continue"}
            <SkipForward size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
}

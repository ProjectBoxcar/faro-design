/**
 * Browser TTS adapter for Faro Call.
 * Captions remain the source of truth; speech is progressive enhancement.
 */

import { sanitizeSpokenText } from "@/lib/faro-call/call-answers";

export type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
};

let voicesReady: Promise<void> | null = null;

function ensureVoices(): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve();
  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const done = () => {
        window.speechSynthesis.onvoiceschanged = null;
        resolve();
      };
      window.speechSynthesis.onvoiceschanged = done;
      // Fallback if event never fires
      setTimeout(done, 400);
    });
  }
  return voicesReady;
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const primary = lang.slice(0, 2).toLowerCase();
  const scored = voices
    .filter((v) => v.lang.toLowerCase().startsWith(primary))
    .map((v) => {
      let score = 0;
      const n = v.name.toLowerCase();
      if (/natural|neural|premium|enhanced|online/.test(n)) score += 4;
      if (/google|microsoft|samantha|aria|jenny|guy/.test(n)) score += 3;
      if (/female|zira|susan/.test(n)) score += 1;
      if (v.localService) score += 1;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.v ?? voices.find((v) => v.lang.toLowerCase().startsWith(primary)) ?? voices[0] ?? null;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
}

/** Speak text; returns a cancel function. */
export function speakText(text: string, opts: SpeakOptions = {}): () => void {
  if (!canSpeak() || !text.trim()) {
    opts.onEnd?.();
    return () => undefined;
  }

  stopSpeaking();
  const clean = sanitizeSpokenText(text);
  if (!clean) {
    opts.onEnd?.();
    return () => undefined;
  }

  let cancelled = false;
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = opts.lang ?? "en-US";
  u.rate = opts.rate ?? 0.92;
  u.pitch = opts.pitch ?? 1;

  u.onend = () => {
    if (!cancelled) opts.onEnd?.();
  };
  u.onerror = (e) => {
    if (!cancelled) {
      opts.onError?.(e);
      opts.onEnd?.();
    }
  };

  void ensureVoices().then(() => {
    if (cancelled) return;
    const voice = pickVoice(u.lang);
    if (voice) u.voice = voice;
    // Chrome: cancel + tiny delay avoids clipped first syllable
    window.speechSynthesis.cancel();
    setTimeout(() => {
      if (!cancelled) window.speechSynthesis.speak(u);
    }, 40);
  });

  return () => {
    cancelled = true;
    stopSpeaking();
  };
}

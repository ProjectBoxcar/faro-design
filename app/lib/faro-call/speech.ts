/**
 * Browser TTS adapter for Faro Call.
 * Captions remain the source of truth; speech is progressive enhancement.
 */

export type SpeakOptions = {
  lang?: string;
  rate?: number;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
};

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const primary = lang.slice(0, 2).toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(primary) && /female|natural|neural/i.test(v.name)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(primary)) ||
    voices[0] ||
    null
  );
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
  const u = new SpeechSynthesisUtterance(text.trim());
  u.lang = opts.lang ?? "en-US";
  u.rate = opts.rate ?? 1;
  const voice = pickVoice(u.lang);
  if (voice) u.voice = voice;

  u.onend = () => opts.onEnd?.();
  u.onerror = (e) => {
    opts.onError?.(e);
    opts.onEnd?.();
  };

  // Chrome often needs voices loaded asynchronously
  const start = () => window.speechSynthesis.speak(u);
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      const v = pickVoice(u.lang);
      if (v) u.voice = v;
      start();
    };
  }
  start();

  return () => stopSpeaking();
}

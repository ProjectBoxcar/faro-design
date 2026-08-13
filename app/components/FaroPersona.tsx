"use client";

/**
 * Living Faro agent face — lighthouse lamp-eyes that follow the cursor.
 * Editorial look (cream paper, teal shell, coral lamps) matches site illustrations.
 * Behavior: dock/follow assistant — not a portrait mascot.
 */

import { useEffect, useRef, useState } from "react";
import { FARO_MOOD_LABEL, moodLabelKey, type FaroMood } from "@/lib/faro-persona";
import { useLocale } from "@/components/LocaleProvider";

type Props = {
  size?: number;
  mood?: FaroMood;
  speaking?: boolean;
  className?: string;
  showMoodRing?: boolean;
  /** When false, eyes stay centered (tiny bubble avatars) */
  trackCursor?: boolean;
};

const MAX_LOOK = 3.2; // viewBox units inside each eye

export function FaroPersona({
  size = 72,
  mood = "calm",
  speaking = false,
  className = "",
  showMoodRing = true,
  trackCursor = true,
}: Props) {
  const { t } = useLocale();
  const moodLabel = t(moodLabelKey(mood)) || FARO_MOOD_LABEL[mood];
  const rootRef = useRef<HTMLSpanElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!trackCursor) {
      setLook({ x: 0, y: 0 });
      return;
    }

    function onMove(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const strength = Math.min(1, dist / 180);
      const nx = (dx / dist) * MAX_LOOK * strength;
      const ny = (dy / dist) * MAX_LOOK * strength;
      setLook({ x: nx, y: ny });
    }

    function onLeave() {
      setLook({ x: 0, y: 0 });
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [trackCursor]);

  const lamp =
    mood === "careful"
      ? "var(--brand-accent, #F25C2A)"
      : mood === "proud"
        ? "var(--brand-signal, #E8B417)"
        : "var(--brand-accent, #F25C2A)";
  const teal = "var(--brand-primary, #16514B)";
  const tealDeep = "var(--brand-primary-strong, #0E3C37)";
  const paper = "var(--brand-paper, #F5F1E8)";
  const ink = "var(--brand-ink, #111111)";
  const line = "var(--brand-line, #D8D1C0)";

  const ringClass =
    mood === "careful"
      ? "ring-[var(--faro-accent)]/45"
      : mood === "proud"
        ? "ring-[var(--brand-signal)]/50"
        : "ring-[var(--accent)]/30";

  const biasY =
    mood === "careful" ? 0.4 : mood === "proud" ? -0.25 : mood === "thinking" ? -0.15 : 0;
  const px = look.x;
  const py = look.y + biasY;

  return (
    <span
      ref={rootRef}
      className={`relative inline-flex shrink-0 items-center justify-center ${className} ${
        speaking ? "faro-persona-speaking" : ""
      }`}
      style={{ width: size, height: size }}
      title={`Faro — ${moodLabel}`}
      role="img"
      aria-label={`Faro, ${moodLabel}`}
    >
      <span
        className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full ${
          showMoodRing ? `ring-2 ${ringClass}` : ""
        }`}
        style={{ background: paper }}
      >
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className={`faro-robot-face ${speaking ? "is-speaking" : ""}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Soft paper disc (editorial illustration frame) */}
          <circle cx="32" cy="32" r="30" fill={paper} />
          <circle cx="32" cy="32" r="29.2" stroke={line} strokeWidth="0.6" opacity="0.7" />

          {/* Teal shell — slightly soft ellipse, illustration weight */}
          <circle cx="32" cy="34.5" r="21" fill={teal} />
          <circle cx="32" cy="34.5" r="21" stroke={tealDeep} strokeWidth="0.8" opacity="0.35" />
          <circle cx="32" cy="34.5" r="17.2" fill={paper} />
          <circle cx="32" cy="34.5" r="17.2" stroke={line} strokeWidth="0.5" opacity="0.55" />

          {/* Cupola + lamp (lighthouse beacon) */}
          <rect x="28.5" y="9" width="7" height="5" rx="1.2" fill={teal} />
          <path d="M27 9.5 L32 5.5 L37 9.5 Z" fill={tealDeep} opacity="0.9" />
          <circle
            cx="32"
            cy="6.5"
            r="3.4"
            fill={lamp}
            className={speaking ? "faro-robot-lamp-on" : "faro-robot-lamp"}
          />
          {/* Soft beam when speaking */}
          <g className="faro-robot-beams" opacity={speaking ? 0.55 : 0.25}>
            <path d="M32 6.5 L18 2" stroke={lamp} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M32 6.5 L46 2" stroke={lamp} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M32 6.5 L32 0.5" stroke={lamp} strokeWidth="1" strokeLinecap="round" />
          </g>

          {/* Eye sockets — ink wells */}
          <circle cx="24" cy="33.5" r="6.8" fill={ink} opacity="0.9" />
          <circle cx="40" cy="33.5" r="6.8" fill={ink} opacity="0.9" />
          <circle cx="24" cy="33.5" r="6.8" stroke={tealDeep} strokeWidth="0.4" opacity="0.3" />
          <circle cx="40" cy="33.5" r="6.8" stroke={tealDeep} strokeWidth="0.4" opacity="0.3" />

          {/* Lamp pupils — follow cursor */}
          <g className="faro-robot-pupils-live">
            <circle cx={24 + px} cy={33.5 + py} r="3" fill={lamp} />
            <circle cx={40 + px} cy={33.5 + py} r="3" fill={lamp} />
            <circle cx={23.3 + px} cy={32.7 + py} r="0.9" fill={paper} opacity="0.95" />
            <circle cx={39.3 + px} cy={32.7 + py} r="0.9" fill={paper} opacity="0.95" />
          </g>

          {/* Blink lids */}
          <g className="faro-robot-lids-simple">
            <ellipse cx="24" cy="33.5" rx="7" ry="7" fill={teal} className="faro-robot-lid" />
            <ellipse cx="40" cy="33.5" rx="7" ry="7" fill={teal} className="faro-robot-lid" />
          </g>

          {/* Mouth by mood */}
          {mood === "encouraging" || mood === "proud" ? (
            <path
              d="M27 44.5 Q32 48.5 37 44.5"
              stroke={ink}
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
          ) : mood === "careful" ? (
            <line
              x1="28"
              y1="45.5"
              x2="36"
              y2="45.5"
              stroke={ink}
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.38"
            />
          ) : mood === "thinking" ? (
            <path
              d="M29 45.5 Q32 44 35 45.5"
              stroke={ink}
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
              opacity="0.35"
            />
          ) : (
            <rect x="29.5" y="44.8" width="5" height="1.6" rx="0.8" fill={ink} opacity="0.28" />
          )}
        </svg>
      </span>
    </span>
  );
}

export function FaroPersonaMini({
  mood = "calm",
  speaking = false,
}: {
  mood?: FaroMood;
  speaking?: boolean;
}) {
  return (
    <FaroPersona
      size={28}
      mood={mood}
      speaking={speaking}
      showMoodRing={false}
      trackCursor={false}
    />
  );
}

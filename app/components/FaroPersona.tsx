"use client";

/**
 * Simple Faro robot face — lighthouse lamp-eyes that follow the cursor.
 */

import { useEffect, useRef, useState } from "react";
import { FARO_MOOD_LABEL, type FaroMood } from "@/lib/faro-persona";

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
      // Normalize by distance so far cursor still looks that way, clamped
      const dist = Math.hypot(dx, dy) || 1;
      const strength = Math.min(1, dist / 180);
      const nx = (dx / dist) * MAX_LOOK * strength;
      const ny = (dy / dist) * MAX_LOOK * strength;
      setLook({ x: nx, y: ny });
    }

    function onLeave() {
      // Soft return when pointer leaves window
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
  const paper = "var(--brand-paper, #F5F1E8)";
  const ink = "var(--brand-ink, #111111)";

  const ringClass =
    mood === "careful"
      ? "ring-[var(--faro-accent)]/45"
      : mood === "proud"
        ? "ring-[var(--brand-signal)]/50"
        : "ring-[var(--accent)]/30";

  // Slight mood bias on pupil when not tracking strongly
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
      title={`Faro — ${FARO_MOOD_LABEL[mood]}`}
      role="img"
      aria-label={`Faro, ${FARO_MOOD_LABEL[mood]}`}
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
          {/* Simple circular robot head */}
          <circle cx="32" cy="34" r="22" fill={teal} />
          <circle cx="32" cy="34" r="18" fill={paper} />

          {/* Tiny cupola lamp */}
          <rect x="28" y="8" width="8" height="5" rx="1" fill={teal} />
          <circle
            cx="32"
            cy="7"
            r="3.2"
            fill={lamp}
            className={speaking ? "faro-robot-lamp-on" : "faro-robot-lamp"}
          />

          {/* Left eye socket */}
          <circle cx="24" cy="33" r="7" fill={ink} opacity="0.92" />
          {/* Right eye socket */}
          <circle cx="40" cy="33" r="7" fill={ink} opacity="0.92" />

          {/* Pupils — follow cursor */}
          <g className="faro-robot-pupils-live">
            <circle cx={24 + px} cy={33 + py} r="3.1" fill={lamp} />
            <circle cx={40 + px} cy={33 + py} r="3.1" fill={lamp} />
            <circle cx={23.2 + px} cy={32.2 + py} r="0.85" fill={paper} opacity="0.9" />
            <circle cx={39.2 + px} cy={32.2 + py} r="0.85" fill={paper} opacity="0.9" />
          </g>

          {/* Blink lids (CSS) */}
          <g className="faro-robot-lids-simple">
            <ellipse cx="24" cy="33" rx="7.2" ry="7.2" fill={teal} className="faro-robot-lid" />
            <ellipse cx="40" cy="33" rx="7.2" ry="7.2" fill={teal} className="faro-robot-lid" />
          </g>

          {/* Simple mouth slot */}
          {mood === "encouraging" || mood === "proud" ? (
            <path
              d="M27 44 Q32 48 37 44"
              stroke={ink}
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.45"
            />
          ) : mood === "careful" ? (
            <line x1="28" y1="45" x2="36" y2="45" stroke={ink} strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
          ) : (
            <rect x="29" y="44" width="6" height="1.8" rx="0.9" fill={ink} opacity="0.3" />
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

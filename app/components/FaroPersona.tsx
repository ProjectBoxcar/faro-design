"use client";

import Image from "next/image";
import {
  faceForMood,
  FARO_FACE_DEFAULT,
  FARO_MOOD_LABEL,
  type FaroMood,
} from "@/lib/faro-persona";

/** Faro the keeper — dynamic face by mood (brand portrait set). */
export function FaroPersona({
  size = 72,
  mood = "calm",
  speaking = false,
  className = "",
  showMoodRing = true,
}: {
  size?: number;
  mood?: FaroMood;
  /** Soft ring pulse while thinking / loading */
  speaking?: boolean;
  className?: string;
  showMoodRing?: boolean;
}) {
  const src = faceForMood(mood) || FARO_FACE_DEFAULT;
  const ring =
    mood === "careful"
      ? "ring-[var(--faro-accent)]/50"
      : mood === "proud"
        ? "ring-[var(--ok)]/40"
        : mood === "encouraging"
          ? "ring-[var(--accent)]/35"
          : "ring-[var(--border-strong)]";

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={FARO_MOOD_LABEL[mood]}
    >
      <span
        className={`relative h-full w-full overflow-hidden rounded-full bg-[var(--accent-soft)] ${
          showMoodRing ? `ring-2 ${ring}` : ""
        } ${speaking ? "faro-persona-speaking" : ""}`}
      >
        {/* Key forces remount fade when mood changes */}
        <Image
          key={src}
          src={src}
          alt={`Faro — ${FARO_MOOD_LABEL[mood]}`}
          width={size * 2}
          height={size * 2}
          className="faro-persona-face h-full w-full object-cover object-[center_18%]"
          priority
        />
        {/* Accent pin glow — brand orange */}
        <span
          className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--surface)] ${
            mood === "careful"
              ? "bg-[var(--faro-accent)]"
              : mood === "proud"
                ? "bg-[var(--ok)]"
                : "bg-[var(--faro-accent)]"
          } ${speaking ? "faro-persona-lamp" : ""}`}
          aria-hidden
        />
      </span>
    </span>
  );
}

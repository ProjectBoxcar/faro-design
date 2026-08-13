"use client";

/**
 * Faro the keeper — illustrated lighthouse-guide character.
 * Mood portraits match the site’s cream/teal/coral editorial style.
 */

import { faceForMood, FARO_MOOD_LABEL, type FaroMood } from "@/lib/faro-persona";

type Props = {
  size?: number;
  mood?: FaroMood;
  speaking?: boolean;
  className?: string;
  showMoodRing?: boolean;
  /**
   * Kept for API compatibility with the old robot face.
   * Illustrated eyes are baked into each mood portrait.
   */
  trackCursor?: boolean;
};

export function FaroPersona({
  size = 72,
  mood = "calm",
  speaking = false,
  className = "",
  showMoodRing = true,
}: Props) {
  const src = faceForMood(mood);

  const ringClass =
    mood === "careful"
      ? "ring-[var(--faro-accent)]/50"
      : mood === "proud"
        ? "ring-[var(--brand-signal,#E8B417)]/55"
        : mood === "encouraging"
          ? "ring-[var(--accent)]/40"
          : "ring-[var(--brand-primary,#16514B)]/25";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className} ${
        speaking ? "faro-persona-speaking" : ""
      }`}
      style={{ width: size, height: size }}
      title={`Faro — ${FARO_MOOD_LABEL[mood]}`}
      role="img"
      aria-label={`Faro, ${FARO_MOOD_LABEL[mood]}`}
    >
      <span
        className={`relative h-full w-full overflow-hidden rounded-full bg-[var(--brand-paper,#F5F1E8)] ${
          showMoodRing ? `ring-2 ${ringClass}` : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          draggable={false}
          className={`faro-persona-face h-full w-full object-cover object-[center_18%] ${
            speaking ? "is-speaking" : ""
          }`}
        />
        {/* Soft lamp glow on the pin / lantern — keeps the “living light” feel */}
        <span
          className={`pointer-events-none absolute inset-0 rounded-full ${
            speaking ? "faro-persona-lamp-glow is-speaking" : "faro-persona-lamp-glow"
          }`}
          aria-hidden
        />
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
    />
  );
}

/** Full-body editorial Faro for empty states / intro moments */
export function FaroCharacterFigure({
  className = "",
  decorative = true,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <figure
      className={`relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--brand-paper,#F5F1E8)] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/illustrations/faro-full.jpg"
        alt={decorative ? "" : "Faro, lighthouse guide"}
        width={600}
        height={800}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain object-bottom"
        draggable={false}
      />
    </figure>
  );
}

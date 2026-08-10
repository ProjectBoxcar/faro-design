"use client";

/**
 * Faro — animated lighthouse robot face (brand beacon as a living guide).
 * Moving lamp-eyes, mood-driven look, soft blink. Pure SVG/CSS — no photo.
 */

import { FARO_MOOD_LABEL, type FaroMood } from "@/lib/faro-persona";

type Props = {
  size?: number;
  mood?: FaroMood;
  /** Thinking / loading — eyes search a bit faster */
  speaking?: boolean;
  className?: string;
  showMoodRing?: boolean;
};

/**
 * Pupil offset (viewBox units) by mood — where the robot is “looking”.
 */
function pupilOffset(mood: FaroMood, speaking: boolean): { x: number; y: number } {
  if (speaking) return { x: 0, y: 0.4 };
  switch (mood) {
    case "thinking":
      return { x: 1.6, y: -0.6 };
    case "encouraging":
      return { x: 0, y: 0.3 };
    case "careful":
      return { x: 0, y: 0.9 };
    case "proud":
      return { x: 0, y: -0.5 };
    case "calm":
    default:
      return { x: 0, y: 0 };
  }
}

function eyeOpen(mood: FaroMood): number {
  // scale of vertical open amount (1 = full)
  if (mood === "careful") return 0.72;
  if (mood === "proud") return 1.05;
  if (mood === "encouraging") return 1.08;
  return 1;
}

export function FaroPersona({
  size = 72,
  mood = "calm",
  speaking = false,
  className = "",
  showMoodRing = true,
}: Props) {
  const px = pupilOffset(mood, speaking);
  const open = eyeOpen(mood);
  const lamp =
    mood === "careful"
      ? "var(--brand-accent, #F25C2A)"
      : mood === "proud"
        ? "var(--brand-signal, #E8B417)"
        : "var(--brand-accent, #F25C2A)";
  const body = "var(--brand-primary, #16514B)";
  const paper = "var(--brand-paper, #F5F1E8)";
  const ink = "var(--brand-ink, #111111)";

  const ringClass =
    mood === "careful"
      ? "ring-[var(--faro-accent)]/45"
      : mood === "proud"
        ? "ring-[var(--brand-signal)]/50"
        : "ring-[var(--accent)]/30";

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
        className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[var(--surface-2)] ${
          showMoodRing ? `ring-2 ${ringClass}` : ""
        }`}
      >
        <svg
          viewBox="0 0 80 80"
          width={size}
          height={size}
          className={`faro-robot-face faro-robot-mood-${mood} ${speaking ? "is-speaking" : ""}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Soft paper disc */}
          <circle cx="40" cy="40" r="38" fill={paper} />

          {/* Outer beacon ring */}
          <circle
            cx="40"
            cy="40"
            r="34"
            stroke={body}
            strokeWidth="1.5"
            opacity="0.35"
            className="faro-robot-ring"
          />

          {/* Head / lantern housing — teal tower top */}
          <path
            d="M22 48 C22 28 28 16 40 16 C52 16 58 28 58 48 L54 58 C54 62 48 66 40 66 C32 66 26 62 26 58 Z"
            fill={body}
          />
          {/* Paper face plate (robot face) */}
          <ellipse cx="40" cy="42" rx="16" ry="17" fill={paper} />
          <ellipse cx="40" cy="42" rx="16" ry="17" stroke={ink} strokeWidth="0.6" opacity="0.12" />

          {/* Cupola / antenna lamp on top */}
          <rect x="36" y="10" width="8" height="6" rx="1" fill={body} />
          <circle
            cx="40"
            cy="9"
            r="4"
            fill={lamp}
            className={speaking ? "faro-robot-lamp-on" : "faro-robot-lamp"}
          />
          {/* Beam when speaking */}
          <g className="faro-robot-beams" opacity={speaking ? 0.55 : 0.22}>
            <path d="M40 9 L62 2 L64 10 Z" fill={lamp} />
            <path d="M40 9 L18 2 L16 10 Z" fill={lamp} />
          </g>

          {/* Eyes — robot lamps in windows */}
          <g className="faro-robot-eyes" style={{ transformOrigin: "40px 38px" }}>
            {/* Left eye socket */}
            <ellipse
              cx="33"
              cy="38"
              rx="5.2"
              ry={4.6 * open}
              fill={ink}
              opacity="0.9"
            />
            {/* Right eye socket */}
            <ellipse
              cx="47"
              cy="38"
              rx="5.2"
              ry={4.6 * open}
              fill={ink}
              opacity="0.9"
            />
            {/* Pupils / lamps — move with mood + idle drift */}
            <g className="faro-robot-pupils" style={{ transform: `translate(${px.x}px, ${px.y}px)` }}>
              <circle cx="33" cy="38" r="2.4" fill={lamp} className="faro-robot-pupil" />
              <circle cx="47" cy="38" r="2.4" fill={lamp} className="faro-robot-pupil" />
              {/* Specular dots */}
              <circle cx="32.2" cy="37.2" r="0.7" fill={paper} opacity="0.85" />
              <circle cx="46.2" cy="37.2" r="0.7" fill={paper} opacity="0.85" />
            </g>
            {/* Blink lids */}
            <g className="faro-robot-lids">
              <ellipse cx="33" cy="38" rx="5.4" ry={4.8 * open} fill={body} className="faro-robot-lid" />
              <ellipse cx="47" cy="38" rx="5.4" ry={4.8 * open} fill={body} className="faro-robot-lid" />
            </g>
          </g>

          {/* Mouth — simple robot slot, shape by mood */}
          {mood === "encouraging" || mood === "proud" ? (
            <path
              d="M34 50 Q40 55 46 50"
              stroke={ink}
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
              opacity="0.55"
            />
          ) : mood === "careful" ? (
            <path
              d="M35 51 L45 51"
              stroke={ink}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
          ) : mood === "thinking" ? (
            <path
              d="M36 51 Q40 49 44 51"
              stroke={ink}
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.45"
            />
          ) : (
            <rect x="36" y="50" width="8" height="2" rx="1" fill={ink} opacity="0.35" />
          )}

          {/* Gallery line under face */}
          <rect x="28" y="58" width="24" height="3" rx="0.5" fill={paper} opacity="0.35" />
        </svg>
      </span>
    </span>
  );
}

/** Tiny face for speech-bubble row */
export function FaroPersonaMini({
  mood = "calm",
  speaking = false,
}: {
  mood?: FaroMood;
  speaking?: boolean;
}) {
  return <FaroPersona size={28} mood={mood} speaking={speaking} showMoodRing={false} />;
}

"use client";

/**
 * Lighthouse Faro silhouette — the coach character shape (tower + lamp + base).
 */

export function FaroCoachMark({
  size = 48,
  className = "",
  lit = true,
}: {
  size?: number;
  className?: string;
  /** Soft lamp glow when guiding */
  lit?: boolean;
}) {
  const ink = "var(--brand-ink, #111111)";
  const sea = "var(--brand-primary, #16514B)";
  const flame = "var(--brand-accent, #F25C2A)";

  return (
    <span
      className={`inline-flex shrink-0 items-end justify-center ${className}`}
      style={{ width: size, height: Math.round(size * 1.35) }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 88"
        width={size}
        height={Math.round(size * 1.35)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Beam wash */}
        {lit ? (
          <g opacity="0.35">
            <path d="M32 18 L58 6 L60 16 Z" fill={flame} className="faro-coach-beam" />
            <path d="M32 18 L6 6 L4 16 Z" fill={flame} className="faro-coach-beam" />
            <path d="M32 18 L56 28 L52 36 Z" fill={flame} opacity="0.5" className="faro-coach-beam" />
          </g>
        ) : null}

        {/* Lamp glow */}
        {lit ? (
          <circle cx="32" cy="16" r="10" fill={flame} opacity="0.18" className="faro-coach-glow" />
        ) : null}

        {/* Cupola / lamp */}
        <circle cx="32" cy="14" r="4" fill={lit ? flame : ink} className={lit ? "faro-coach-lamp" : undefined} />
        <rect x="29" y="17.5" width="6" height="4" rx="0.6" fill={ink} />

        {/* Lantern house */}
        <path d="M24 21.5 L40 21.5 L38 32 L26 32 Z" fill={ink} />
        <rect x="27" y="24" width="3" height="5" rx="0.3" fill="var(--surface, #F5F1E8)" opacity="0.85" />
        <rect x="34" y="24" width="3" height="5" rx="0.3" fill="var(--surface, #F5F1E8)" opacity="0.85" />

        {/* Gallery */}
        <rect x="22" y="32" width="20" height="3" rx="0.5" fill={ink} />

        {/* Tower — tapered lighthouse body */}
        <path d="M25 35 L39 35 L42 68 L22 68 Z" fill={sea} />
        {/* Stripe bands */}
        <path d="M24.2 44 L39.8 44 L40.4 50 L23.6 50 Z" fill="var(--surface, #F5F1E8)" opacity="0.92" />
        <path d="M23.2 56 L40.8 56 L41.3 62 L22.7 62 Z" fill="var(--surface, #F5F1E8)" opacity="0.92" />

        {/* Door */}
        <rect x="29" y="58" width="6" height="10" rx="1" fill={ink} opacity="0.55" />

        {/* Base / rocks */}
        <path
          d="M12 72 Q20 68 32 70 Q44 68 52 72 L54 80 L10 80 Z"
          fill={ink}
          opacity="0.9"
        />
        <ellipse cx="32" cy="80" rx="26" ry="5" fill={sea} opacity="0.35" />
      </svg>
    </span>
  );
}

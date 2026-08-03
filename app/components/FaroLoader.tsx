"use client";

/**
 * Brand loading animation — the Faro beacon from the visual system mark.
 * Use for generation and long waits; keep small spinners only for tiny buttons.
 */
import type { ReactNode } from "react";

type Size = "sm" | "md" | "lg" | "xl" | "hero";

const SIZE_PX: Record<Size, number> = {
  sm: 36,
  md: 64,
  lg: 96,
  xl: 128,
  hero: 168,
};

export function FaroBeacon({
  size = "md",
  className = "",
  tone = "ink",
}: {
  size?: Size;
  className?: string;
  /** ink = paper backgrounds; light = dark generation panels */
  tone?: "ink" | "light";
}) {
  const px = SIZE_PX[size];
  const stroke = tone === "light" ? "rgba(255,255,255,0.92)" : "var(--brand-ink, #111111)";
  const fill = stroke;
  const glow = tone === "light" ? "rgba(255,255,255,0.55)" : "var(--brand-primary, #16514B)";
  const beam = tone === "light" ? "rgba(255,255,255,0.35)" : "var(--brand-accent, #F25C2A)";

  return (
    <span
      className={`faro-loader inline-flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 80 80"
        width={px}
        height={px}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Soft outer glow */}
        <circle cx="40" cy="40" r="34" className="faro-loader-ring" stroke={glow} strokeWidth="1" opacity="0.35" />

        {/* Sweeping light beams (Faro = lighthouse) */}
        <g className="faro-loader-beams" style={{ transformOrigin: "40px 22px" }}>
          <path d="M40 22 L72 8 L74 18 Z" fill={beam} opacity="0.45" />
          <path d="M40 22 L8 8 L6 18 Z" fill={beam} opacity="0.28" />
          <path d="M40 22 L70 36 L68 44 Z" fill={beam} opacity="0.2" />
        </g>

        {/* Beacon tower — matches implement-pack mark geometry */}
        <g stroke={stroke} fill={fill} strokeLinejoin="round">
          {/* Cupola / light */}
          <circle cx="40" cy="14" r="3.2" className="faro-loader-lamp" fill={fill} stroke="none" />
          <rect x="37.5" y="16.5" width="5" height="3.5" rx="0.5" stroke="none" />
          {/* Lantern slits */}
          <polygon points="34,20 46,20 44,28 36,28" stroke="none" />
          {/* Gallery */}
          <rect x="33" y="28" width="14" height="2.5" rx="0.4" stroke="none" />
          {/* Tower body */}
          <path d="M35 30.5 L45 30.5 L47 58 L33 58 Z" stroke="none" />
          {/* Base / waterline frame (logo rectangle hint) */}
          <rect
            x="18"
            y="58"
            width="44"
            height="10"
            rx="1"
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
          />
        </g>
      </svg>
    </span>
  );
}

/** Compact status row: beacon + label (inline). */
export function FaroLoaderInline({
  label = "Working…",
  size = "sm",
  tone = "ink",
  className = "",
}: {
  label?: string;
  size?: Size;
  tone?: "ink" | "light";
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2.5 text-sm text-[var(--muted)] ${className}`}
    >
      <FaroBeacon size={size} tone={tone} />
      <span className={tone === "light" ? "text-white/70" : undefined}>{label}</span>
    </span>
  );
}

/**
 * Full-panel generation wait: large beacon + title + optional progress.
 * Use for Express strategy and similar multi-minute runs.
 */
export function FaroLoaderPanel({
  title,
  description,
  progressPercent,
  progressLabel,
  children,
  tone = "ink",
  className = "",
  beaconSize = "hero",
}: {
  title: string;
  description?: string;
  progressPercent?: number;
  progressLabel?: string;
  children?: ReactNode;
  tone?: "ink" | "light";
  className?: string;
  beaconSize?: Size;
}) {
  const dark = tone === "light";
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center text-center ${className}`}
    >
      <div className="relative flex items-center justify-center py-4">
        <div
          className="faro-loader-halo absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-64 sm:w-64"
          style={{
            background: dark
              ? "radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 68%)"
              : "radial-gradient(circle, color-mix(in srgb, var(--brand-primary) 22%, transparent) 0%, color-mix(in srgb, var(--brand-accent) 10%, transparent) 45%, transparent 70%)",
          }}
          aria-hidden
        />
        <FaroBeacon size={beaconSize} tone={tone} />
      </div>
      <h1
        className={`mt-6 font-serif text-3xl font-medium tracking-tight ${
          dark ? "text-white" : "text-[var(--foreground)]"
        }`}
      >
        {title}
      </h1>
      {description ? (
        <p className={`mt-2 max-w-md text-sm leading-relaxed ${dark ? "text-white/65" : "text-[var(--muted)]"}`}>
          {description}
        </p>
      ) : null}
      {typeof progressPercent === "number" ? (
        <div className="mt-8 w-full max-w-sm">
          <div className="flex items-center gap-3">
            <div
              className={`h-1.5 flex-1 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-[var(--surface-2)]"}`}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  dark ? "bg-white/85" : "bg-[var(--accent)]"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${
                dark ? "text-white" : "text-[var(--foreground)]"
              }`}
            >
              {progressPercent}%
            </span>
          </div>
          {progressLabel ? (
            <p className={`mt-2 text-xs ${dark ? "text-white/45" : "text-[var(--subtle)]"}`}>
              {progressLabel}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

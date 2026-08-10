"use client";

import Image from "next/image";

/** Faro the keeper — portrait persona for the journey coach. */
export function FaroPersona({
  size = 72,
  speaking = false,
  className = "",
}: {
  size?: number;
  /** Soft ring pulse while “talking” / loading */
  speaking?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-[var(--accent-soft)] ${className} ${
        speaking ? "faro-persona-speaking" : ""
      }`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/faro-persona.jpg"
        alt="Faro, your lighthouse guide"
        width={size * 2}
        height={size * 2}
        className="h-full w-full object-cover object-[center_18%]"
        priority
      />
      {/* Small lighthouse lamp pin on badge edge */}
      <span
        className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--faro-accent)] ring-2 ring-[var(--surface)]"
        aria-hidden
      />
    </span>
  );
}

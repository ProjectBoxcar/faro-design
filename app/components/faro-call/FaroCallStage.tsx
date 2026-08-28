"use client";

import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import type { CallMedia } from "@/lib/faro-call/types";

export function FaroCallStage({ media }: { media: CallMedia }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Shared screen
        </p>
        <p className="truncate text-xs font-medium text-[var(--foreground)]">{media.title}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {media.kind === "logo" && media.svg ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className="flex min-h-[10rem] items-center justify-center rounded-lg border border-[var(--border)] p-6 [&_svg]:max-h-24 [&_svg]:w-full"
              style={{ background: "#F5F1E8" }}
              dangerouslySetInnerHTML={{ __html: media.svg }}
            />
            <div
              className="flex min-h-[10rem] items-center justify-center rounded-lg p-6 [&_svg]:max-h-24 [&_svg]:w-full"
              style={{ background: "#0E1B2A" }}
              dangerouslySetInnerHTML={{ __html: media.svgOnDark || media.svg }}
            />
          </div>
        ) : null}

        {media.kind === "html" && media.html ? (
          <iframe
            title={media.title}
            className="h-[min(52vh,28rem)] w-full rounded-lg border border-[var(--border)] bg-white"
            sandbox="allow-scripts"
            srcDoc={media.html}
          />
        ) : null}

        {media.kind === "text" || media.kind === "cta" || media.kind === "none" ? (
          <div className="flex h-full min-h-[10rem] flex-col justify-center px-2 py-6">
            <p className="font-serif text-lg font-medium tracking-tight text-[var(--foreground)]">
              {media.title}
            </p>
            {media.body ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">
                {media.body}
              </p>
            ) : null}
          </div>
        ) : null}

        {media.kind === "checklist" && media.items ? (
          <ul className="space-y-2 py-2">
            {media.items.map((item) => (
              <li
                key={item.label}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  item.ready
                    ? "border-[var(--ok)]/30 bg-[var(--ok)]/10 text-[var(--ok)]"
                    : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {item.ready ? (
                  <Check size={14} />
                ) : (
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--border-strong)]" />
                )}
                {item.label}
                <span className="text-xs opacity-80">{item.ready ? "· ready" : "· needed"}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {media.ctaHref && media.ctaLabel ? (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <Link
            href={media.ctaHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            {media.ctaLabel} <ExternalLink size={12} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

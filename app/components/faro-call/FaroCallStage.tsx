"use client";

import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import type { CallMedia } from "@/lib/faro-call/types";
import { sanitizeStudioSvg } from "@/lib/studio-svg";
import { useLocale } from "@/components/LocaleProvider";

export function FaroCallStage({
  media,
  agendaLabel,
}: {
  media: CallMedia;
  /** Active agenda short name echoed in Sharing bar */
  agendaLabel?: string;
}) {
  const { t } = useLocale();
  const safeSvg = media.svg ? sanitizeStudioSvg(media.svg) : null;
  const safeSvgOnDark = media.svgOnDark ? sanitizeStudioSvg(media.svgOnDark) : safeSvg;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--call-border)] bg-[var(--call-panel)] shadow-[0_20px_60px_rgba(0,0,0,.35)]">
      <div className="flex items-center gap-2 border-b border-[var(--call-border)] px-4 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)] shadow-[0_0_8px_var(--ok)]" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
          {t("call.sharing")}
        </p>
        {agendaLabel ? (
          <span className="hidden rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/75 sm:inline">
            {agendaLabel}
          </span>
        ) : null}
        <p className="min-w-0 flex-1 truncate text-right text-xs font-medium text-white/90">
          {media.title}
        </p>
      </div>

      {/* PiP-safe bottom padding on desktop only — mobile has no PiP card */}
      <div className="min-h-0 flex-1 overflow-auto bg-[var(--call-panel-2)] p-4 pb-6 sm:pb-16">
        {media.kind === "logo" && safeSvg ? (
          <div className="grid h-full min-h-[12rem] gap-3 sm:grid-cols-2">
            <div
              className="flex items-center justify-center rounded-xl border border-white/10 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)] sm:p-8 [&_svg]:max-h-28 [&_svg]:w-full"
              style={{ background: "#F5F1E8" }}
              dangerouslySetInnerHTML={{ __html: safeSvg }}
            />
            <div
              className="flex items-center justify-center rounded-xl border border-white/10 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)] sm:p-8 [&_svg]:max-h-28 [&_svg]:w-full"
              style={{ background: "#0E1B2A" }}
              dangerouslySetInnerHTML={{ __html: safeSvgOnDark || safeSvg }}
            />
          </div>
        ) : null}

        {media.kind === "html" && media.html ? (
          <div className="flex h-full min-h-[16rem] flex-col">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
              {t("call.preview")}
            </p>
            <iframe
              title={media.title}
              className="h-full min-h-[16rem] w-full flex-1 rounded-xl border border-white/15 bg-white shadow-[0_12px_40px_rgba(0,0,0,.35)]"
              sandbox="allow-scripts"
              srcDoc={media.html}
            />
          </div>
        ) : null}

        {(media.kind === "text" || media.kind === "cta" || media.kind === "none") && (
          <div className="mx-auto flex h-full min-h-[12rem] max-w-xl flex-col items-start justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-8 text-left sm:px-8 sm:py-10">
            <p className="font-serif text-2xl font-medium tracking-tight text-white/95 sm:text-[1.75rem]">
              {media.title}
            </p>
            {media.body ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/75 sm:text-[15px]">
                {media.body}
              </p>
            ) : null}
          </div>
        )}

        {media.kind === "checklist" && media.items ? (
          <div className="mx-auto flex h-full max-w-lg flex-col justify-center py-2">
            <p className="mb-3 font-serif text-lg font-medium text-white/95 sm:text-xl">{media.title}</p>
            <ul className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
              {media.items.map((item) => (
                <li
                  key={item.label}
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${
                    item.ready
                      ? "border-[var(--ok)]/40 bg-[var(--ok)]/15 text-[#9dccb0]"
                      : "border-white/10 bg-white/5 text-white/55"
                  }`}
                >
                  {item.ready ? (
                    <Check size={15} className="shrink-0" aria-hidden />
                  ) : (
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full bg-white/30"
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <span className="text-[11px] opacity-80">
                    {item.ready ? t("call.ready") : t("call.needed")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {media.ctaHref && media.ctaLabel ? (
        <div className="border-t border-[var(--call-border)] px-4 py-2.5">
          <Link
            href={media.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full text-xs font-medium text-[#e8a88a] transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
          >
            {media.ctaLabel} <ExternalLink size={12} aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

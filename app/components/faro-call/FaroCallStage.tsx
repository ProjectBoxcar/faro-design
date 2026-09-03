"use client";

import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import type { CallMedia } from "@/lib/faro-call/types";
import { sanitizeStudioSvg } from "@/lib/studio-svg";
import { useLocale } from "@/components/LocaleProvider";

export function FaroCallStage({ media }: { media: CallMedia }) {
  const { t } = useLocale();
  const safeSvg = media.svg ? sanitizeStudioSvg(media.svg) : null;
  const safeSvgOnDark = media.svgOnDark
    ? sanitizeStudioSvg(media.svgOnDark)
    : safeSvg;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1210] shadow-[0_20px_60px_rgba(0,0,0,.35)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)] shadow-[0_0_8px_var(--ok)]" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">
          {t("call.sharing")}
        </p>
        <p className="min-w-0 flex-1 truncate text-right text-xs font-medium text-white/85">
          {media.title}
        </p>
      </div>

      {/* Extra bottom padding so Faro PiP doesn't cover content */}
      <div className="min-h-0 flex-1 overflow-auto bg-[#111814] p-4 pb-20 sm:pb-16">
        {media.kind === "logo" && safeSvg ? (
          <div className="grid h-full min-h-[12rem] gap-3 sm:grid-cols-2">
            <div
              className="flex items-center justify-center rounded-xl border border-white/10 p-6 sm:p-8 [&_svg]:max-h-28 [&_svg]:w-full"
              style={{ background: "#F5F1E8" }}
              dangerouslySetInnerHTML={{ __html: safeSvg }}
            />
            <div
              className="flex items-center justify-center rounded-xl border border-white/10 p-6 sm:p-8 [&_svg]:max-h-28 [&_svg]:w-full"
              style={{ background: "#0E1B2A" }}
              dangerouslySetInnerHTML={{ __html: safeSvgOnDark || safeSvg }}
            />
          </div>
        ) : null}

        {media.kind === "html" && media.html ? (
          <iframe
            title={media.title}
            className="h-full min-h-[16rem] w-full rounded-xl border border-white/10 bg-white"
            sandbox="allow-scripts"
            srcDoc={media.html}
          />
        ) : null}

        {(media.kind === "text" || media.kind === "cta" || media.kind === "none") && (
          <div className="flex h-full min-h-[12rem] flex-col items-start justify-center px-2 py-6 text-left sm:py-8">
            <p className="font-serif text-xl font-medium tracking-tight text-white/95 sm:text-2xl">
              {media.title}
            </p>
            {media.body ? (
              <p className="mt-3 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-white/60">
                {media.body}
              </p>
            ) : null}
          </div>
        )}

        {media.kind === "checklist" && media.items ? (
          <ul className="mx-auto grid max-w-lg gap-2 py-3">
            {media.items.map((item) => (
              <li
                key={item.label}
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${
                  item.ready
                    ? "border-[var(--ok)]/40 bg-[var(--ok)]/15 text-[#9dccb0]"
                    : "border-white/10 bg-white/5 text-white/50"
                }`}
              >
                {item.ready ? (
                  <Check size={15} className="shrink-0" aria-hidden />
                ) : (
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-white/25" aria-hidden />
                )}
                <span className="min-w-0 flex-1">{item.label}</span>
                <span className="text-[11px] opacity-70">
                  {item.ready ? t("call.ready") : t("call.needed")}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {media.ctaHref && media.ctaLabel ? (
        <div className="border-t border-white/10 px-4 py-2.5">
          <Link
            href={media.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7eb8a8] transition hover:text-white"
          >
            {media.ctaLabel} <ExternalLink size={12} aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

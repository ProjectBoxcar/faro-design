"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { AppLocale } from "@/lib/i18n/types";

/** Compact EN | ES control for headers. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, locales, t } = useLocale();

  return (
    <div
      className={`inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-strong)] p-0.5 ${className}`}
      role="group"
      aria-label={t("nav.language")}
    >
      {locales.map((opt) => {
        const active = locale === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLocale(opt.id as AppLocale)}
            className={`rounded-[calc(var(--radius-md)-2px)] px-2.5 py-1 text-[11px] font-semibold tracking-wide transition ${
              active
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-pressed={active}
            title={opt.label}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}

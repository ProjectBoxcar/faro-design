"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/LocaleProvider";
import { IllustrativeFigure } from "@/components/IllustrativeFigure";

export function SettingsHeader() {
  const { t } = useLocale();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={15} /> {t("nav.allProjects")}
        </Link>
        <LanguageSwitcher />
      </div>
      <header className="mt-3 mb-5 grid items-start gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <h1 className="font-serif text-2xl font-medium tracking-tight lg:text-3xl">{t("settings.title")}</h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">{t("settings.blurb")}</p>
        </div>
        <IllustrativeFigure
          id="settingsKeys"
          size="sm"
          className="hidden border border-[var(--border)] sm:block"
          decorative
        />
      </header>
    </>
  );
}

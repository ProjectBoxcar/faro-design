"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/LocaleProvider";

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
      <header className="mt-3 mb-6">
        <h1 className="font-serif text-4xl font-medium tracking-tight">{t("settings.title")}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("settings.blurb")}</p>
      </header>
    </>
  );
}

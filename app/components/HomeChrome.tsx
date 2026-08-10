"use client";

import Link from "next/link";
import { ArrowRight, Settings } from "lucide-react";
import { FaroMark } from "@/components/FaroMark";
import { NewProjectButton } from "@/components/NewProjectButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/LocaleProvider";

export function HomeNav() {
  const { t } = useLocale();
  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 lg:px-12 2xl:max-w-[110rem]">
        <Link href="/" className="text-[var(--foreground)]" aria-label="Faro Design home">
          <FaroMark className="h-8 w-auto sm:h-9" />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/content-studio"
            className="hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--faro-accent)] hover:text-[var(--faro-accent)] sm:inline-flex"
          >
            {t("nav.contentStudio")}
          </Link>
          <Link
            href="/settings"
            aria-label={t("nav.settings")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] text-[var(--muted)] transition hover:border-[var(--faro-accent)] hover:text-[var(--faro-accent)]"
          >
            <Settings size={17} />
          </Link>
          <NewProjectButton />
        </div>
      </div>
    </nav>
  );
}

export function HomeHeroActions({
  headline,
  lede,
  showProjects,
}: {
  headline: string;
  lede: string;
  showProjects: boolean;
}) {
  const { t } = useLocale();
  return (
    <header className="border-b-[3px] border-[var(--foreground)]">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-12 lg:py-20 2xl:max-w-[110rem]">
        <p className="faro-kicker mb-6 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--faro-accent)] px-4 py-1.5">
          {t("home.kicker")}
        </p>
        <h1 className="font-serif max-w-[16ch] text-[clamp(2.75rem,8vw,5.5rem)] font-normal leading-[0.95] tracking-tight text-[var(--foreground)]">
          {headline}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-snug text-[var(--foreground)] sm:text-xl lg:text-[1.35rem]">
          {lede}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/start"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-pop)]"
          >
            {t("home.startBrand")} <ArrowRight size={16} />
          </Link>
          {showProjects ? (
            <a
              href="#projects"
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--foreground)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--foreground)] hover:text-[var(--background)]"
            >
              {t("home.yourProjects")}
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/** @deprecated use HomeNav + HomeHeroActions */
export function HomeChrome() {
  return null;
}

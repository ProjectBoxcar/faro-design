"use client";

import Link from "next/link";
import { ArrowRight, Settings } from "lucide-react";
import { FaroMark } from "@/components/FaroMark";
import { NewProjectButton } from "@/components/NewProjectButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/LocaleProvider";
import { ProjectList } from "@/components/ProjectList";
import { IllustrativeFigure, StageIllustration } from "@/components/IllustrativeFigure";
import type { ComponentProps } from "react";
import type { IllustrationId } from "@/lib/illustrations";

export function HomeNav() {
  const { t } = useLocale();
  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 lg:px-6">
        <Link href="/" className="text-[var(--foreground)]" aria-label="Faro Design home">
          <FaroMark className="h-6 w-auto sm:h-7" />
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] text-[var(--muted)] transition hover:border-[var(--faro-accent)] hover:text-[var(--faro-accent)]"
          >
            <Settings size={17} />
          </Link>
          <NewProjectButton />
        </div>
      </div>
    </nav>
  );
}

export function HomeHeroActions({ showProjects }: { showProjects: boolean }) {
  const { t } = useLocale();
  return (
    <header className="border-b-[3px] border-[var(--foreground)]">
      <div className="mx-auto grid max-w-7xl items-center gap-4 px-3 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-5 lg:px-5 lg:py-6">
        <div>
          <p className="faro-kicker mb-2.5 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--faro-accent)] px-2.5 py-0.5">
            {t("home.kicker")}
          </p>
          <h1 className="font-serif max-w-[16ch] text-[clamp(1.4rem,3.8vw,2rem)] font-normal leading-[0.95] tracking-tight text-[var(--foreground)]">
            {t("home.headline")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-snug text-[var(--foreground)]">
            {t("home.lede")}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/start"
              data-faro-anchor="faro-start-brand"
              className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-pop)]"
            >
              {t("home.startBrand")} <ArrowRight size={14} />
            </Link>
            {showProjects ? (
              <a
                href="#projects"
                data-faro-anchor="faro-home-projects"
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--foreground)] px-3.5 py-1.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--foreground)] hover:text-[var(--background)]"
              >
                {t("home.yourProjects")}
              </a>
            ) : null}
          </div>
        </div>
        <IllustrativeFigure
          id="heroHarbour"
          size="hero"
          className="aspect-[16/9] max-h-[14rem] w-full border border-[var(--border)] object-cover shadow-[var(--shadow-card)] sm:max-h-[18rem]"
        />
      </div>
    </header>
  );
}

export function HomeBodySections({
  projects,
}: {
  projects: ComponentProps<typeof ProjectList>["projects"];
}) {
  const { t } = useLocale();
  const steps: { title: string; text: string; illustration: IllustrationId }[] = [
    { title: t("home.step1Title"), text: t("home.step1Text"), illustration: "stepAnswer" },
    { title: t("home.step2Title"), text: t("home.step2Text"), illustration: "stepStrategy" },
    { title: t("home.step3Title"), text: t("home.step3Text"), illustration: "stepHandoff" },
  ];
  const packageStages = [
    { id: "strategy", name: t("stage.strategy") },
    { id: "name", name: t("stage.name") },
    { id: "logo", name: t("stage.logo") },
    { id: "design", name: t("stage.design") },
    { id: "handover", name: t("stage.handover") },
    { id: "content", name: t("stage.content") },
  ];

  return (
    <>
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
          <p className="faro-kicker">{t("home.howItWorks")}</p>
          <h2 className="font-serif mt-2 max-w-[18ch] text-xl font-normal leading-none tracking-tight sm:text-2xl lg:text-2xl">
            {t("home.howTitle")}
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] transition hover:shadow-[var(--shadow-pop)]"
              >
                <IllustrativeFigure
                  id={step.illustration}
                  size="full"
                  className="aspect-[16/10] w-full rounded-none border-0"
                  decorative
                />
                <div className="p-3.5">
                  <div className="faro-accent-line mb-2.5" />
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-white">
                      {i + 1}
                    </span>
                    <h3 className="font-serif text-base font-normal">{step.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
          <p className="faro-kicker">{t("home.packageKicker")}</p>
          <h2 className="font-serif mt-2 max-w-[16ch] text-xl font-normal leading-none tracking-tight sm:text-2xl">
            {t("home.packageTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("home.packageBlurb")}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {packageStages.map((stage) => (
              <div
                key={stage.id}
                className="card-shadow flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-2.5"
              >
                <StageIllustration
                  stageId={stage.id}
                  size="xs"
                  className="shrink-0 border border-[var(--border)]"
                />
                <div className="text-sm font-semibold leading-snug">{stage.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="projects" className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="faro-kicker">{t("home.workspace")}</p>
            <h2 className="font-serif mt-1 text-xl font-normal tracking-tight sm:text-2xl">
              {t("home.yourProjects")}
            </h2>
          </div>
          <NewProjectButton />
        </div>

        {projects.length === 0 ? (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)]">
            <div className="grid items-center gap-5 p-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:p-8">
              <IllustrativeFigure
                id="emptyHarbour"
                size="full"
                className="aspect-[4/3] w-full max-w-md border border-[var(--border)]"
              />
              <div className="text-center sm:text-left">
                <p className="font-medium text-[var(--foreground)]">{t("home.emptyTitle")}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{t("home.emptyBlurb")}</p>
                <div className="mt-4 flex justify-center sm:justify-start">
                  <NewProjectButton />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ProjectList projects={projects} />
        )}
      </section>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-[var(--subtle)] lg:px-6">
          <span className="font-serif text-sm tracking-wide text-[var(--muted)]">Faro Design</span>
          <span>{t("home.footerTag")}</span>
        </div>
      </footer>
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Expand,
  ExternalLink,
  Maximize2,
  PackageCheck,
  X,
} from "lucide-react";
import type { FinalDesignKind } from "@/lib/design-deliverable";

type PackageOutput = {
  kind: FinalDesignKind;
  label: string;
  variant: string;
};

type ViewId = "overview" | FinalDesignKind;

export function FinalPackageViewer({
  token,
  projectName,
  clientName,
  outputs,
  /** In-app: use project package API so the left rail stays visible. */
  previewBase,
  embedded = false,
  briefHref,
}: {
  token?: string | null;
  projectName: string;
  clientName: string | null;
  outputs: PackageOutput[];
  /** e.g. `/api/projects/${id}/package` — preferred for in-app handover */
  previewBase?: string;
  embedded?: boolean;
  briefHref?: string;
}) {
  const [active, setActive] = useState<ViewId>("overview");
  const [fullscreen, setFullscreen] = useState(false);
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const packageRoot =
    previewBase ??
    (token ? `/share/${token}/package` : null);
  const strategyBriefHref = briefHref ?? (token ? `/share/${token}` : null);

  const tabs: Array<{ id: ViewId; label: string }> = [
    { id: "overview", label: "Overview" },
    ...outputs.map((output) => ({ id: output.kind, label: output.label })),
  ];

  function activate(id: ViewId) {
    setActive(id);
  }

  function moveTab(index: number, direction: number) {
    const next = (index + direction + tabs.length) % tabs.length;
    tabsRef.current[next]?.focus();
    activate(tabs[next].id);
  }

  const exitFullscreen = useCallback(() => setFullscreen(false), []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen, exitFullscreen]);

  const frameSrc = (kind: FinalDesignKind) =>
    packageRoot ? `${packageRoot}/${kind}` : undefined;

  const viewer = (
    <div
      ref={shellRef}
      className={
        embedded && !fullscreen
          ? "rounded-2xl border border-[var(--border)] bg-[var(--background)] overflow-hidden"
          : "min-h-screen bg-[var(--background)]"
      }
    >
      <header
        className={`z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl ${
          fullscreen ? "sticky top-0" : embedded ? "sticky top-0" : "sticky top-0"
        }`}
      >
        <div
          className={`flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between ${
            embedded && !fullscreen ? "lg:px-5" : "mx-auto max-w-[110rem] lg:px-8"
          }`}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--subtle)]">
              {embedded ? "Brand Handover" : "Private final package"}
            </p>
            <h1 className="truncate font-serif text-xl font-medium tracking-tight sm:text-2xl">
              {projectName}
            </h1>
            {clientName && (
              <p className="truncate text-xs text-[var(--muted)]">Prepared for {clientName}</p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav
              role="tablist"
              aria-label="Final package sections"
              className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-[var(--surface-2)] p-1"
            >
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabsRef.current[index] = node;
                  }}
                  id={`tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={active === tab.id ? 0 : -1}
                  onClick={() => activate(tab.id)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight") moveTab(index, 1);
                    if (event.key === "ArrowLeft") moveTab(index, -1);
                    if (event.key === "Home") {
                      event.preventDefault();
                      tabsRef.current[0]?.focus();
                      activate(tabs[0].id);
                    }
                    if (event.key === "End") {
                      event.preventDefault();
                      tabsRef.current[tabs.length - 1]?.focus();
                      activate(tabs[tabs.length - 1].id);
                    }
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                    active === tab.id
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            {embedded && (
              <button
                type="button"
                onClick={() => setFullscreen((v) => !v)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-xs font-medium transition hover:bg-[var(--surface-2)]"
              >
                {fullscreen ? (
                  <>
                    <X size={14} /> Exit full screen
                  </>
                ) : (
                  <>
                    <Maximize2 size={14} /> Full screen
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          tabIndex={0}
          hidden={active !== "overview"}
          className={`mx-auto max-w-6xl px-5 py-10 sm:px-8 ${fullscreen ? "lg:py-16" : "lg:py-12"}`}
        >
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <PackageCheck size={22} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">
              Final delivery
            </p>
            <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight sm:text-5xl">
              The complete {projectName} brand package
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Explore the approved identity system, landing page, and brand deck. Everything here is
              the final selected direction.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {outputs.map((output, index) => (
              <button
                key={output.kind}
                type="button"
                onClick={() => activate(output.kind)}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left card-shadow transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold">
                    {index + 1}
                  </span>
                  <Check size={16} className="text-[var(--ok)]" />
                </div>
                <h3 className="mt-8 font-serif text-xl font-medium">{output.label}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Final proposal {output.variant}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                  View result <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>

          {strategyBriefHref && (
            <div className="mt-10 border-t border-[var(--border)] pt-6">
              <a
                href={strategyBriefHref}
                target={embedded ? "_blank" : undefined}
                rel={embedded ? "noreferrer" : undefined}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                <ExternalLink size={15} /> Read the strategic brief
              </a>
            </div>
          )}
        </section>

        {outputs.map((output) => {
          const src = frameSrc(output.kind);
          return (
            <section
              key={output.kind}
              id={`panel-${output.kind}`}
              role="tabpanel"
              aria-labelledby={`tab-${output.kind}`}
              tabIndex={0}
              hidden={active !== output.kind}
              className="bg-white"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3 sm:px-8">
                <div>
                  <h2 className="font-serif text-lg font-medium">{output.label}</h2>
                  <p className="text-xs text-[var(--muted)]">Final proposal {output.variant}</p>
                </div>
                {embedded && !fullscreen && active === output.kind && (
                  <button
                    type="button"
                    onClick={() => setFullscreen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    <Expand size={13} /> Bigger view
                  </button>
                )}
              </div>
              {src ? (
                <iframe
                  title={`${output.label} final preview`}
                  src={src}
                  className={
                    fullscreen
                      ? "h-[calc(100vh-7rem)] min-h-[36rem] w-full border-0 bg-white"
                      : embedded
                        ? "h-[min(70vh,48rem)] min-h-[28rem] w-full border-0 bg-white"
                        : "h-[calc(100vh-10.25rem)] min-h-[36rem] w-full border-0 bg-white lg:h-[calc(100vh-7.4rem)]"
                  }
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
                  Preview unavailable
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[80] overflow-y-auto bg-[var(--background)]">
        {viewer}
      </div>
    );
  }

  return viewer;
}

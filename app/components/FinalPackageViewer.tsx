"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, ExternalLink, PackageCheck } from "lucide-react";
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
}: {
  token: string;
  projectName: string;
  clientName: string | null;
  outputs: PackageOutput[];
}) {
  const [active, setActive] = useState<ViewId>("overview");
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[110rem] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--subtle)]">
              Private final package
            </p>
            <h1 className="truncate font-serif text-xl font-medium tracking-tight sm:text-2xl">{projectName}</h1>
            {clientName && <p className="truncate text-xs text-[var(--muted)]">Prepared for {clientName}</p>}
          </div>
          <nav
            role="tablist"
            aria-label="Final package sections"
            className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-[var(--surface-2)] p-1"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                ref={(node) => { tabsRef.current[index] = node; }}
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
        </div>
      </header>

      <main>
        <section
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          tabIndex={0}
          hidden={active !== "overview"}
          className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-20"
        >
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <PackageCheck size={22} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">Final delivery</p>
            <h2 className="mt-3 font-serif text-4xl font-medium tracking-tight sm:text-6xl">
              The complete {projectName} brand package
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Explore the approved identity system, landing page, and brand deck. Everything here is the final selected direction.
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

          <div className="mt-10 border-t border-[var(--border)] pt-6">
            <a
              href={`/share/${token}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              <ExternalLink size={15} /> Read the strategic brief
            </a>
          </div>
        </section>

        {outputs.map((output) => (
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
            </div>
            <iframe
              title={`${output.label} final preview`}
              src={`/share/${token}/package/${output.kind}`}
              className="h-[calc(100vh-10.25rem)] min-h-[36rem] w-full border-0 bg-white lg:h-[calc(100vh-7.4rem)]"
              sandbox="allow-scripts"
            />
          </section>
        ))}
      </main>
    </div>
  );
}

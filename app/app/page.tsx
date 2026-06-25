import Link from "next/link";
import { Settings } from "lucide-react";
import { listProjects, completedCountByProject } from "@/lib/queries";
import { NewProjectButton } from "@/components/NewProjectButton";
import { StrategyArc, type ArcPhase } from "@/components/StrategyArc";
import { ProgressBar } from "@/components/ProgressBar";
import { overview } from "@/lib/guide";
import { totalSteps } from "@/lib/flow";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  at_risk: "At risk",
  blocked: "Blocked",
  archived: "Archived",
};

const PHASE_LABEL: Record<string, string> = {
  strategic: "Strategic",
  planning: "Planning",
  design: "Design",
};

export const dynamic = "force-dynamic";

export default function Home() {
  const projects = listProjects();
  const completed = completedCountByProject();
  const total = totalSteps();
  const ov = overview();
  const arc: ArcPhase[] = ov.phases.map((p) => ({
    id: p.id,
    name: p.name,
    oneLiner: p.oneLiner,
    produces: p.produces,
  }));

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-12 lg:py-14 2xl:max-w-[110rem]">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-5xl font-medium leading-[1.02] tracking-tight lg:text-7xl">
            {ov.title}
          </h1>
          <p className="mt-3 max-w-3xl text-base text-[var(--muted)]">{ov.tagline}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/settings"
            aria-label="Settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <Settings size={17} />
          </Link>
          <NewProjectButton />
        </div>
      </header>

      {/* What this app is for */}
      <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow lg:p-8">
        <p className="text-base leading-relaxed text-[var(--muted)]">{ov.summary}</p>
        <h2 className="mt-6 mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          How it works — four phases
        </h2>
        <StrategyArc phases={arc} />
      </section>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Your projects
        </h2>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-12 text-center">
          <p className="text-[var(--muted)]">No projects yet.</p>
          <p className="mt-1 text-sm text-[var(--subtle)]">
            Create your first brand engagement to start the Strategic phase.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="card-shadow flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 transition hover:bg-[var(--surface-2)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    {p.client_name && (
                      <div className="truncate text-sm text-[var(--subtle)]">{p.client_name}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-[var(--muted)]">
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5">
                      {PHASE_LABEL[p.current_phase]}
                    </span>
                    <span
                      className={
                        p.status === "blocked"
                          ? "text-[var(--danger)]"
                          : p.status === "at_risk"
                          ? "text-[var(--warn)]"
                          : ""
                      }
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                </div>
                <ProgressBar done={completed.get(p.id) ?? 0} total={total} showPercent />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

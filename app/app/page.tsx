import Link from "next/link";
import { Settings, Sparkles } from "lucide-react";
import { listProjects, getSections } from "@/lib/queries";
import { NewProjectButton } from "@/components/NewProjectButton";
import { ProgressBar } from "@/components/ProgressBar";
import { overview } from "@/lib/guide";
import { reviewProgress, type StatusMap } from "@/lib/flow";

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
  // Progress = the owner's guided review journey (the four screens), the same
  // metric the project hub shows — NOT all 70 methodology steps, most of which
  // are optional design-phase work. Finishing the review reads as 100%.
  const progress = new Map(
    projects.map((p) => {
      const map: StatusMap = new Map(getSections(p.id).map((r) => [r.section_key, r.status]));
      return [p.id, reviewProgress(map)];
    })
  );
  const ov = overview();

  // Plain-language explainer of the things a brand is built from — the first
  // concepts a newcomer meets ("Reality", "Identity"…) and needs defined up front.
  const PARTS = [
    { name: "Reality", text: "The plain facts: what you sell, who it's for, and what makes you different." },
    { name: "Identity", text: "How you see yourself: your story, what you believe, and where you're headed." },
    { name: "Communication", text: "How your brand should sound and behave, and the promise it makes." },
  ];
  const STEPS = [
    "Answer a handful of plain questions about your business.",
    "The app drafts your whole strategy from your answers.",
    "Review each piece, then hand a clear brief to your designer.",
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-12 lg:py-14 2xl:max-w-[110rem]">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-5xl font-medium leading-[1.02] tracking-tight lg:text-7xl">
            {ov.title}
          </h1>
          <p className="mt-4 max-w-3xl font-serif text-2xl font-normal leading-snug tracking-tight text-[var(--foreground)] lg:text-3xl">
            {ov.tagline}
          </p>
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
        <p className="max-w-3xl text-base leading-relaxed text-[var(--muted)]">{ov.summary}</p>

        <h2 className="mt-7 mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-medium text-white">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <h2 className="mt-7 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          What goes into your brand
        </h2>
        <p className="mb-3 mt-1 max-w-3xl text-sm text-[var(--muted)]">
          A brand is more than a logo. You&apos;ll work through the four things it&apos;s built on — the app drafts each
          from your answers, and you just review:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PARTS.map((p) => (
            <div key={p.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-semibold">{p.name}</div>
              <p className="mt-0.5 text-sm text-[var(--muted)]">{p.text}</p>
            </div>
          ))}
        </div>
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
            <li key={p.id} className="card-shadow flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 transition hover:bg-[var(--surface-2)]">
              <Link href={`/projects/${p.id}`} className="block">
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
              </Link>
              <Link href={`/projects/${p.id}`} className="block">
                <ProgressBar
                  done={progress.get(p.id)?.done ?? 0}
                  total={progress.get(p.id)?.total ?? 1}
                  showPercent
                />
              </Link>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                <Link
                  href={`/projects/${p.id}`}
                  className="text-xs text-[var(--subtle)] transition hover:text-[var(--foreground)]"
                >
                  {progress.get(p.id)?.done === progress.get(p.id)?.total ? "Strategy ready" : "In progress"}
                </Link>
                <Link
                  href={`/projects/${p.id}/design`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)]"
                >
                  <Sparkles size={12} /> Design Studio
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

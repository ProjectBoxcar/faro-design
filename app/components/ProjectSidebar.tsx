import Link from "next/link";
import { ArrowLeft, Check, Lock, Settings } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

export type SidebarPhase = {
  id: string;
  name: string;
  done: number;
  total: number;
  unlocked: boolean;
  isCurrent: boolean;
};

// Desktop-only left rail: project identity, overall progress, and the 4-phase
// orientation map. Detailed steps stay behind "View all steps" so it never
// overwhelms — the rail is just "where am I in the journey".
export function ProjectSidebar({
  projectId,
  projectName,
  clientName,
  greenfield,
  overall,
  phases,
}: {
  projectId: string;
  projectName: string;
  clientName?: string | null;
  greenfield?: boolean;
  overall: { done: number; total: number };
  phases: SidebarPhase[];
}) {
  return (
    <aside
      className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[var(--border)] lg:flex"
      style={{ backgroundColor: "rgba(250,248,243,0.82)", backdropFilter: "blur(20px)" }}
    >
      <div className="p-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={15} /> All projects
        </Link>
      </div>

      <div className="px-5">
        <Link href={`/projects/${projectId}`} className="block">
          <h1 className="font-serif text-xl font-semibold tracking-tight">{projectName}</h1>
        </Link>
        {clientName && <p className="text-sm text-[var(--muted)]">{clientName}</p>}
        {greenfield && (
          <p className="mt-1 text-xs text-[var(--subtle)]">Greenfield — audit skipped</p>
        )}
        <div className="mt-4">
          <div className="mb-1 text-xs text-[var(--subtle)]">Progress</div>
          <ProgressBar done={overall.done} total={overall.total} showPercent />
        </div>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-6">
        <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Journey
        </div>
        <ol className="space-y-0.5">
          {phases.map((p, i) => {
            const complete = p.total > 0 && p.done === p.total;
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${
                  p.isCurrent ? "bg-[var(--accent-soft)]" : ""
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                    complete
                      ? "bg-[var(--ok)] text-white"
                      : p.isCurrent
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface-2)] text-[var(--muted)]"
                  }`}
                >
                  {complete ? <Check size={13} /> : !p.unlocked ? <Lock size={11} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-sm ${p.isCurrent ? "font-medium" : "text-[var(--muted)]"}`}>
                      {p.name}
                    </span>
                    {p.isCurrent && (
                      <span className="shrink-0 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        Now
                      </span>
                    )}
                  </span>
                  <ProgressBar done={p.done} total={p.total} className="mt-1.5" />
                </span>
              </li>
            );
          })}
        </ol>
        <Link
          href={`/projects/${projectId}?plan=open#plan`}
          className="mt-3 block rounded-xl px-2.5 py-2 text-sm text-[var(--accent)] transition hover:bg-[var(--surface-2)]"
        >
          View all steps →
        </Link>
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          <Settings size={15} /> Settings
        </Link>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Compass,
  FileText,
  Lightbulb,
  Palette,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { ProgressBar } from "./ProgressBar";

// A pillar-level review screen (one of the numbered steps in the old flat list).
export type SidebarGroup = {
  id: string;
  name: string;
  done: number;
  total: number;
  isCurrent: boolean;
};

// A methodology phase that owns several review groups. The rail groups steps
// under these so each phase — especially the Design studio — is discoverable
// instead of buried at the bottom of one long list.
export type SidebarPhase = {
  id: string;
  name: string;
  done: number;
  total: number;
  isCurrent: boolean;
  groups: SidebarGroup[];
};

// Per-phase presentation: an icon so the rail is scannable, a short hint, and an
// optional display label. The Design phase surfaces as "Design Studio" — the
// place the designer explores names, visual territory and the brand system —
// while the underlying methodology name stays "Design".
const PHASE_META: Record<string, { icon: LucideIcon; label?: string; hint: string }> = {
  strategic: { icon: Compass, hint: "Understand the business" },
  handoff: { icon: FileText, hint: "Write the thinking up cleanly" },
  planning: { icon: Lightbulb, hint: "Turn strategy into a plan" },
  design: { icon: Palette, label: "Design Studio", hint: "Explore names & visual direction" },
};

// Desktop-only left rail: project identity, overall progress, and the guided
// journey grouped by phase. Each phase collapses so the rail stays a calm "where
// am I", and detailed steps still live behind "View all steps" on the hub.
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
  // Highlight the review screen actually being viewed; off review screens
  // (e.g. the hub) fall back to the computed "work on this next" group.
  const routeParams = useParams<{ group?: string }>();
  const viewedGroup = routeParams?.group ? decodeURIComponent(routeParams.group) : null;

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
        <div className="space-y-1">
          {phases.map((phase) => (
            <PhaseSection
              key={phase.id}
              projectId={projectId}
              phase={phase}
              viewedGroup={viewedGroup}
            />
          ))}
        </div>
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

function PhaseSection({
  projectId,
  phase,
  viewedGroup,
}: {
  projectId: string;
  phase: SidebarPhase;
  viewedGroup: string | null;
}) {
  const meta = PHASE_META[phase.id];
  const Icon = meta?.icon ?? Compass;
  const label = meta?.label ?? phase.name;
  const complete = phase.total > 0 && phase.done === phase.total;
  const holdsViewed = viewedGroup ? phase.groups.some((g) => g.id === viewedGroup) : false;
  // Open the phase you're viewing, or (off review screens) the phase you're
  // working on next; the rest stay tucked away so the rail never overwhelms.
  const [open, setOpen] = useState(holdsViewed || (!viewedGroup && phase.isCurrent));

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-[var(--surface-2)]"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            complete
              ? "bg-[var(--ok)] text-white"
              : phase.isCurrent
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-2)] text-[var(--muted)]"
          }`}
        >
          {complete ? <Check size={13} /> : <Icon size={13} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{label}</span>
            {phase.isCurrent && (
              <span className="shrink-0 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                Now
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[var(--subtle)]">
            {meta?.hint ?? `${phase.done}/${phase.total} done`}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-[var(--subtle)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ol className="mb-1 ml-[1.55rem] space-y-0.5 border-l border-[var(--border)] pl-2">
          {phase.groups.map((g) => {
            const done = g.total > 0 && g.done === g.total;
            const current = viewedGroup ? g.id === viewedGroup : g.isCurrent;
            return (
              <li key={g.id}>
                <Link
                  href={`/projects/${projectId}/review/${g.id}`}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition ${
                    current ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {done ? (
                      <Check size={13} className="text-[var(--ok)]" />
                    ) : (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          current ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
                        }`}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={`truncate text-[13px] ${
                          current ? "font-medium" : "text-[var(--muted)]"
                        }`}
                      >
                        {g.name}
                      </span>
                      {current && (
                        <span className="shrink-0 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                          {viewedGroup ? "Viewing" : "Next"}
                        </span>
                      )}
                    </span>
                    <ProgressBar done={g.done} total={g.total} className="mt-1" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

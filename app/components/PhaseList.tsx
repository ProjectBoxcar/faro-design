"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Check, Lock } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

export type SectionItem = {
  id: string;
  name: string;
  status: string;
  locked: boolean;
  lockReason?: string;
  kind: string;
  internal?: boolean;
};

export type PillarItem = {
  id: string;
  name: string;
  intro?: string;
  sections: SectionItem[];
};

export type PhaseItem = {
  id: string;
  name: string;
  intro?: string;
  done: number;
  total: number;
  unlocked: boolean;
  isCurrent: boolean;
  pillars: PillarItem[];
};

export function PhaseList({ projectId, phases }: { projectId: string; phases: PhaseItem[] }) {
  return (
    <div className="space-y-3 xl:grid xl:grid-cols-2 xl:items-start xl:gap-3 xl:space-y-0 2xl:grid-cols-3">
      {phases.map((phase) => (
        <PhaseRow key={phase.id} projectId={projectId} phase={phase} />
      ))}
    </div>
  );
}

function PhaseRow({ projectId, phase }: { projectId: string; phase: PhaseItem }) {
  const [open, setOpen] = useState(phase.isCurrent);
  const complete = phase.total > 0 && phase.done === phase.total;

  return (
    <div className="card-shadow overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
            complete
              ? "bg-[var(--ok)] text-white"
              : phase.unlocked
              ? "bg-[var(--accent-soft)] text-[var(--muted)]"
              : "bg-[var(--surface-2)] text-[var(--subtle)]"
          }`}
        >
          {complete ? <Check size={13} /> : phase.unlocked ? "" : <Lock size={11} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-medium">{phase.name}</span>
            {phase.isCurrent && (
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                current
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div className="px-4 pb-1">
        <ProgressBar done={phase.done} total={phase.total} className="mb-2" showPercent />
      </div>

      {open && (
        <div className="px-4 pb-4">
          {phase.intro && <p className="mb-3 text-sm text-[var(--muted)]">{phase.intro}</p>}
          <div className="space-y-4">
            {phase.pillars.map((pillar) => (
              <div key={pillar.id}>
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--subtle)]">
                  {pillar.name}
                </div>
                <ul className="mt-1 divide-y divide-[var(--border)]">
                  {pillar.sections.map((s) => (
                    <SectionRow key={s.id} projectId={projectId} section={s} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionRow({ projectId, section }: { projectId: string; section: SectionItem }) {
  const dot =
    section.status === "complete"
      ? "var(--ok)"
      : section.status === "draft"
      ? "var(--warn)"
      : section.status === "client_submitted"
      ? "var(--client)"
      : "var(--border-strong)";

  const inner = (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-2">
        {section.status === "complete" ? (
          <Check size={14} className="text-[var(--ok)]" />
        ) : (
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
        )}
        <span className={`text-sm ${section.locked ? "text-[var(--subtle)]" : ""}`}>
          {section.name}
        </span>
        {section.internal && (
          <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--subtle)]">
            internal
          </span>
        )}
      </span>
      {section.locked ? (
        <span className="flex items-center gap-1 text-xs text-[var(--subtle)]">
          <Lock size={12} /> {section.lockReason}
        </span>
      ) : (
        <span className="text-xs text-[var(--accent)]">Open</span>
      )}
    </div>
  );

  if (section.locked) {
    return (
      <li title={section.lockReason} className="cursor-not-allowed opacity-70">
        {inner}
      </li>
    );
  }
  return (
    <li>
      <Link
        href={`/projects/${projectId}/${encodeURIComponent(section.id)}`}
        className="block transition hover:opacity-80"
      >
        {inner}
      </Link>
    </li>
  );
}

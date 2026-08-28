"use client";

import type { CallAgendaItem, CallStageId } from "@/lib/faro-call/types";

export function FaroCallAgenda({
  agenda,
  activeStageId,
  onJump,
}: {
  agenda: CallAgendaItem[];
  activeStageId: CallStageId;
  onJump: (stageId: CallStageId) => void;
}) {
  return (
    <nav aria-label="Call agenda" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
        Agenda
      </p>
      <ol className="space-y-1">
        {agenda.map((item, i) => {
          const active = item.id === activeStageId;
          const locked = item.status === "locked";
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onJump(item.id)}
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : locked
                      ? "cursor-not-allowed text-[var(--subtle)] opacity-60"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="mt-0.5 tabular-nums text-[10px] font-semibold opacity-70">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug">{item.name}</span>
                  <span className="block truncate text-[10px] opacity-80">{item.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

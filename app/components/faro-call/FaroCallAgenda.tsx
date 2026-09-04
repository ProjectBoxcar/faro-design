"use client";

import { Check, LockKeyhole } from "lucide-react";
import type { CallAgendaItem, CallStageId } from "@/lib/faro-call/types";

export function FaroCallAgenda({
  agenda,
  activeStageId,
  onJump,
  disabled = false,
}: {
  agenda: CallAgendaItem[];
  activeStageId: CallStageId;
  onJump: (stageId: CallStageId) => void;
  disabled?: boolean;
}) {
  return (
    <nav aria-label="Call agenda" className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
      {agenda.map((item, i) => {
        const active = item.id === activeStageId;
        const locked = item.status === "locked";
        const done = item.status === "done";
        const short = item.name.replace(/^\d+\.\s*/, "");
        return (
          <button
            key={item.id}
            type="button"
            disabled={locked || disabled}
            title={item.detail}
            aria-current={active ? "true" : undefined}
            aria-label={
              locked
                ? `${short}, locked: ${item.detail}`
                : active
                  ? `${short}, current`
                  : done
                    ? `${short}, done`
                    : short
            }
            onClick={() => onJump(item.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              active
                ? "border-white/25 bg-white text-[#0a0f0d]"
                : done
                  ? "border-[var(--ok)]/40 bg-[var(--ok)]/15 text-[#9dccb0]"
                  : locked
                    ? "cursor-not-allowed border-white/8 bg-transparent text-white/45"
                    : "border-white/12 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white"
            } ${disabled && !locked ? "opacity-60" : ""}`}
          >
            {locked ? (
              <LockKeyhole size={10} aria-hidden />
            ) : done ? (
              <Check size={10} aria-hidden />
            ) : (
              <span className="tabular-nums opacity-70" aria-hidden>
                {i + 1}
              </span>
            )}
            {short}
          </button>
        );
      })}
    </nav>
  );
}

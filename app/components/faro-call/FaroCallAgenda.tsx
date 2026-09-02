"use client";

import { Check, LockKeyhole } from "lucide-react";
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
            disabled={locked}
            title={item.detail}
            onClick={() => onJump(item.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              active
                ? "border-white/25 bg-white text-[#0a0f0d]"
                : done
                  ? "border-[var(--ok)]/40 bg-[var(--ok)]/15 text-[#9dccb0]"
                  : locked
                    ? "cursor-not-allowed border-white/8 bg-transparent text-white/30"
                    : "border-white/12 bg-white/5 text-white/65 hover:border-white/25 hover:bg-white/10 hover:text-white"
            }`}
          >
            {locked ? (
              <LockKeyhole size={10} />
            ) : done ? (
              <Check size={10} />
            ) : (
              <span className="tabular-nums opacity-70">{i + 1}</span>
            )}
            {short}
          </button>
        );
      })}
    </nav>
  );
}

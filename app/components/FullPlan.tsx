"use client";

import { useState } from "react";
import { List, ChevronDown } from "lucide-react";
import { PhaseList, type PhaseItem } from "./PhaseList";

// The detailed, every-step list — hidden by default so the hub stays focused on
// the current step. The big-picture arc lives above this, always visible.
export function FullPlan({
  projectId,
  phases,
  defaultOpen = false,
}: {
  projectId: string;
  phases: PhaseItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
      >
        <List size={15} />
        {open ? "Hide all steps" : "View all steps"}
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4">
          <PhaseList projectId={projectId} phases={phases} />
        </div>
      )}
    </div>
  );
}

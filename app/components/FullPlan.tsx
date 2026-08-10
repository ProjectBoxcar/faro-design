"use client";

import { useState } from "react";
import { List, ChevronDown } from "lucide-react";
import { PhaseList, type PhaseItem } from "./PhaseList";
import { useLocale } from "@/components/LocaleProvider";

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
  const { t } = useLocale();

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
      >
        <List size={15} />
        {open ? t("fullPlan.hide") : t("fullPlan.show")}
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4">
          <p className="mb-3 text-xs text-[var(--muted)]">{t("fullPlan.blurb")}</p>
          <PhaseList projectId={projectId} phases={phases} />
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function NewProjectButton() {
  return (
    <Link
      href="/start"
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-card)] transition hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-pop)]"
    >
      <Plus size={14} /> New project
    </Link>
  );
}

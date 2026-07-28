"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function NewProjectButton() {
  return (
    <Link
      href="/start"
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-pop)]"
    >
      <Plus size={16} /> New project
    </Link>
  );
}

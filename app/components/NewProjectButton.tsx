"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function NewProjectButton() {
  return (
    <Link
      href="/start"
      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
    >
      <Plus size={16} /> New project
    </Link>
  );
}

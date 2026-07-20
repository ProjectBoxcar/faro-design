"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Settings, Sparkles } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

// Mobile-only sticky top bar: frosted, with a context-aware back button (out to
// all projects from the hub, back to the hub from a step) and a slim progress bar.
export function ProjectMobileBar({
  projectId,
  projectName,
  overall,
}: {
  projectId: string;
  projectName: string;
  overall: { done: number; total: number };
}) {
  const path = usePathname();
  const onHub = path === `/projects/${projectId}`;
  const backHref = onHub ? "/" : `/projects/${projectId}`;

  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--border)] lg:hidden"
      style={{
        backgroundColor: "rgba(250,248,243,0.85)",
        backdropFilter: "blur(20px)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href={backHref}
          aria-label="Back"
          className="-ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition active:bg-[var(--surface-2)]"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="flex-1 truncate text-sm font-medium">{projectName}</span>
        <Link
          href={`/projects/${projectId}/design`}
          aria-label="Design Studio"
          aria-current={path === `/projects/${projectId}/design` ? "page" : undefined}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition active:bg-[var(--surface-2)] ${
            path === `/projects/${projectId}/design`
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "text-[var(--muted)]"
          }`}
        >
          <Sparkles size={17} />
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition active:bg-[var(--surface-2)]"
        >
          <Settings size={17} />
        </Link>
      </div>
      <ProgressBar done={overall.done} total={overall.total} />
    </header>
  );
}

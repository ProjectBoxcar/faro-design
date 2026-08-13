"use client";

import type { ReactNode } from "react";
import { StageIllustration } from "@/components/IllustrativeFigure";

/**
 * Compact stage illustration beside a page title block.
 * Use inside stage page headers so owners see what stage means visually.
 */
export function StagePageBanner({
  stageId,
  children,
  className = "",
}: {
  stageId: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between ${className}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <StageIllustration
        stageId={stageId}
        size="md"
        className="shrink-0 self-start border border-[var(--border)] shadow-[var(--shadow-card)] sm:self-center"
      />
    </header>
  );
}

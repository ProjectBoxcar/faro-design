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
  "data-faro-anchor": faroAnchor,
}: {
  stageId: string;
  children: ReactNode;
  className?: string;
  "data-faro-anchor"?: string;
}) {
  return (
    <header
      className={`mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}
      data-faro-anchor={faroAnchor}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <StageIllustration
        stageId={stageId}
        size="sm"
        className="hidden shrink-0 self-start border border-[var(--border)] shadow-[var(--shadow-card)] sm:block sm:self-center lg:h-16 lg:w-16"
      />
    </header>
  );
}

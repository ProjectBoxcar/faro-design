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
      className={`mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between ${className}`}
      data-faro-anchor={faroAnchor}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {/* Photos read huge; keep stage art tiny and desktop-only */}
      <StageIllustration
        stageId={stageId}
        size="xs"
        className="hidden shrink-0 self-start border border-[var(--border)] shadow-[var(--shadow-card)] lg:block lg:h-11 lg:w-11"
      />
    </header>
  );
}

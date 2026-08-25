"use client";

import { motion, useScroll, useSpring } from "motion/react";

// Thin bar along the top that fills as you scroll, so long review screens show
// how much reading is left. Offset past the sidebar on desktop (w-72).
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-1.5 bg-[var(--accent-soft)] lg:left-60">
      <motion.div
        style={{ scaleX }}
        className="h-full w-full origin-left rounded-r-full bg-[var(--accent)] shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
      />
    </div>
  );
}

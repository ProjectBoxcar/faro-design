"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { getSection, getPhaseOf, getPillarOf } from "@/lib/methodology";

// A `template` re-mounts on every navigation (unlike `layout`), so this runs each
// time the owner moves to another step: a brief full-bleed "chapter card" with the
// step's name, then the step itself fades in. Makes each move unmistakable instead
// of an instant, easy-to-miss swap.
export default function SectionTemplate({ children }: { children: React.ReactNode }) {
  const params = useParams<{ section: string }>();
  const sectionKey = params?.section ? decodeURIComponent(params.section) : "";
  const section = getSection(sectionKey);
  const phase = getPhaseOf(sectionKey);
  const pillar = getPillarOf(sectionKey);

  const [showCard, setShowCard] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowCard(false), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showCard && section && (
          <motion.div
            key="chapter-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            // Covers the working area; the journey sidebar (w-60) stays put on desktop.
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[var(--background)] lg:left-52"
          >
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="px-6 text-center"
            >
              {(phase || pillar) && (
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
                  {phase?.name}
                  {pillar ? ` · ${pillar.name}` : ""}
                </div>
              )}
              <h1 className="mt-2 font-serif text-lg font-medium tracking-tight lg:text-xl">
                {section.name}
              </h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </>
  );
}

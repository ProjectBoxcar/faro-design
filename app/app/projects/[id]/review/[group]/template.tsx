"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { getReviewGroup } from "@/lib/flow";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";

// Brief "chapter card" on each move between the four review screens, so the owner
// clearly sees they advanced. Re-mounts per navigation (it's a template).
export default function ReviewTemplate({ children }: { children: React.ReactNode }) {
  const params = useParams<{ group: string }>();
  const group = params?.group ? getReviewGroup(decodeURIComponent(params.group)) : undefined;

  const [showCard, setShowCard] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowCard(false), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <ScrollProgressBar />
      <AnimatePresence>
        {showCard && group && (
          <motion.div
            key="chapter-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[var(--background)] lg:left-60"
          >
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="px-6 text-center"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">Reviewing</div>
              <h1 className="mt-2 font-serif text-2xl font-medium tracking-tight lg:text-3xl">{group.name}</h1>
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

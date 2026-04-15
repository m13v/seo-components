"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StickyBottomCtaProps {
  description: string;
  buttonLabel: string;
  href: string;
  scrollThreshold?: number;
}

export function StickyBottomCta({
  description,
  buttonLabel,
  href,
  scrollThreshold = 600,
}: StickyBottomCtaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > scrollThreshold);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, [scrollThreshold]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 backdrop-blur-xl py-3 px-6"
          style={{ backgroundColor: "var(--mobile-bg)" }}
        >
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <p className="text-sm text-zinc-500 hidden sm:block">
              {description}
            </p>
            <a
              href={href}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors"
            >
              {buttonLabel}
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

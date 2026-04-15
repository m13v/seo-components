"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ParallaxSectionProps {
  children: React.ReactNode;
  /** Background element that moves at a different scroll speed */
  background?: React.ReactNode;
  /** Parallax intensity: 0 = none, 1 = max. Default 0.3 */
  intensity?: number;
  className?: string;
}

/**
 * Section with a parallax scrolling effect on the background.
 * The foreground content scrolls normally while the background
 * moves at a slower rate, creating depth.
 */
export function ParallaxSection({
  children,
  background,
  intensity = 0.3,
  className = "",
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [
    -80 * intensity,
    80 * intensity,
  ]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <div ref={ref} className={`relative overflow-hidden my-10 ${className}`}>
      {/* Parallax background */}
      {background && (
        <motion.div
          style={{ y }}
          className="absolute inset-0 pointer-events-none"
        >
          {background}
        </motion.div>
      )}

      {/* Foreground content */}
      <motion.div style={{ opacity }} className="relative z-10">
        {children}
      </motion.div>
    </div>
  );
}

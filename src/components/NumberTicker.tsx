"use client";

import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

interface NumberTickerProps {
  value: number;
  /** Number of decimal places */
  decimals?: number;
  /** Duration of the count-up animation in seconds */
  duration?: number;
  /** Optional prefix (e.g. "$") */
  prefix?: string;
  /** Optional suffix (e.g. "%") */
  suffix?: string;
  className?: string;
}

/**
 * Magic UI style number ticker. Counts up from 0 to the target
 * value with spring physics when scrolled into view. Smoother
 * than a plain `useEffect` interval because it uses framer-motion
 * motion values.
 */
export function NumberTicker({
  value,
  decimals = 0,
  duration = 1.6,
  prefix = "",
  suffix = "",
  className = "",
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    const unsub = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent =
          prefix +
          latest.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) +
          suffix;
      }
    });
    return () => unsub();
  }, [springValue, decimals, prefix, suffix]);

  return (
    <motion.span
      ref={ref}
      className={`tabular-nums font-bold text-zinc-900 ${className}`}
    >
      {prefix}0{suffix}
    </motion.span>
  );
}

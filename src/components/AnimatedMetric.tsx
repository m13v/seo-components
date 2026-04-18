"use client";

import { motion, useInView, useSpring, useMotionValue } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface AnimatedMetricProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  decimals?: number;
}

export function AnimatedMetric({
  value,
  suffix = "",
  prefix = "",
  label,
  decimals = 0,
}: AnimatedMetricProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView) motionVal.set(value);
  }, [isInView, motionVal, value]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v: number) => {
      setDisplay(v.toFixed(decimals));
    });
    return unsubscribe;
  }, [spring, decimals]);

  return (
    <motion.div
      ref={ref}
      className="flex flex-col items-center p-4"
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-400 tabular-nums">
        {prefix}{display}
        {suffix && <span className="text-base font-semibold">{suffix}</span>}
      </span>
      <span className="text-xs text-zinc-500 mt-1 text-center">{label}</span>
    </motion.div>
  );
}

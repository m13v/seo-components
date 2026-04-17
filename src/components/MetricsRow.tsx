"use client";

import { motion } from "framer-motion";
import { AnimatedMetric } from "./AnimatedMetric";

interface Metric {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  decimals?: number;
}

interface MetricsRowProps {
  metrics: Metric[];
}

export function MetricsRow({ metrics }: MetricsRowProps) {
  return (
    <motion.div
      className="my-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-200 dark:divide-zinc-800"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {metrics.map((m, i) => (
        <AnimatedMetric key={i} {...m} />
      ))}
    </motion.div>
  );
}

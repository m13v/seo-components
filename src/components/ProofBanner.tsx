"use client";

import { motion } from "framer-motion";

interface ProofBannerProps {
  quote: string;
  source?: string;
  metric: string;
}

export function ProofBanner({ quote, source, metric }: ProofBannerProps) {
  return (
    <motion.div
      className="my-8 p-4 rounded-xl border border-zinc-200 bg-white flex items-start gap-4"
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="shrink-0 text-center">
        <span className="text-2xl font-bold text-teal-600">{metric}</span>
      </div>
      <div>
        <p className="text-sm text-subtle-text italic">
          &ldquo;{quote}&rdquo;
        </p>
        {source ? <p className="text-xs text-zinc-500 mt-1">{source}</p> : null}
      </div>
    </motion.div>
  );
}

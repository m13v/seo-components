"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CodeComparisonProps {
  leftCode: string;
  rightCode: string;
  leftLines: number;
  rightLines: number;
  leftLabel: string;
  rightLabel: string;
  title?: string;
  reductionSuffix?: string;
}

export function CodeComparison({
  leftCode,
  rightCode,
  leftLines,
  rightLines,
  leftLabel,
  rightLabel,
  title,
  reductionSuffix = "fewer lines",
}: CodeComparisonProps) {
  const [tab, setTab] = useState<"left" | "right">("left");
  const reduction = Math.round((1 - rightLines / leftLines) * 100);

  return (
    <motion.div
      className="my-8 rounded-2xl border border-zinc-200 bg-white overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-white/50">
        {title && (
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-500">{title}</p>
        )}
        <div className="flex gap-1 rounded-lg bg-white p-0.5 border border-zinc-200">
          <button
            onClick={() => setTab("left")}
            className={`text-[11px] font-medium px-3 py-1 rounded-md transition-colors ${
              tab === "left"
                ? "bg-teal-500/10 text-teal-600"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {leftLabel} ({leftLines} lines)
          </button>
          <button
            onClick={() => setTab("right")}
            className={`text-[11px] font-medium px-3 py-1 rounded-md transition-colors ${
              tab === "right"
                ? "bg-emerald-500/10 text-emerald-500"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {rightLabel} ({rightLines} lines)
          </button>
        </div>
      </div>

      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait">
          {tab === "left" ? (
            <motion.pre
              key="left"
              className="p-5 text-sm font-mono overflow-x-auto"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <code className="text-code-text">{leftCode}</code>
            </motion.pre>
          ) : (
            <motion.pre
              key="right"
              className="p-5 text-sm font-mono overflow-x-auto"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <code className="text-code-text">{rightCode}</code>
            </motion.pre>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-3 border-t border-zinc-200 bg-white/50 flex items-center gap-3">
        <motion.div
          className="h-1.5 rounded-full bg-emerald-500/20 flex-1 overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: "100%" }}
            whileInView={{ width: `${100 - reduction}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          />
        </motion.div>
        <span className="text-[11px] font-medium text-emerald-500 whitespace-nowrap">
          {reduction}% {reductionSuffix}
        </span>
      </div>
    </motion.div>
  );
}

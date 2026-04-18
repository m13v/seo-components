"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeAfterProps {
  title?: string;
  before: { label: string; content: string; highlights?: string[] };
  after: { label: string; content: string; highlights?: string[] };
  className?: string;
}

export function BeforeAfter({
  title,
  before,
  after,
  className = "",
}: BeforeAfterProps) {
  const [showAfter, setShowAfter] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`my-10 ${className}`}
    >
      {title && (
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">{title}</h3>
      )}

      {/* Toggle */}
      <div className="flex items-center gap-1 mb-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 w-fit">
        <button
          onClick={() => setShowAfter(false)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            !showAfter
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          {before.label}
        </button>
        <button
          onClick={() => setShowAfter(true)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            showAfter
              ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          {after.label}
        </button>
      </div>

      {/* Content panel */}
      <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 overflow-hidden min-h-[200px]">
        <AnimatePresence mode="wait">
          {!showAfter ? (
            <motion.div
              key="before"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="p-6"
            >
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {before.content}
              </p>
              {before.highlights && (
                <ul className="mt-4 space-y-2">
                  {before.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-red-600"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="after"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="p-6"
            >
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {after.content}
              </p>
              {after.highlights && (
                <ul className="mt-4 space-y-2">
                  {after.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

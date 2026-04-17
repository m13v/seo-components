"use client";

import { motion } from "framer-motion";

interface ChecklistItem {
  text: string;
  checked?: boolean;
}

interface AnimatedChecklistProps {
  title: string;
  items: ChecklistItem[];
}

export function AnimatedChecklist({ title, items }: AnimatedChecklistProps) {
  return (
    <motion.div
      className="my-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="text-xs font-mono uppercase tracking-widest text-emerald-500 mb-4">
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <motion.li
            key={i}
            className="flex items-start gap-3"
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
              delay: i * 0.06,
            }}
          >
            <motion.span
              className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-md border shrink-0 ${
                item.checked !== false
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
              }`}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 + 0.15, type: "spring", stiffness: 300, damping: 20 }}
            >
              {item.checked !== false ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              )}
            </motion.span>
            <span className={`text-sm leading-relaxed ${item.checked !== false ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}`}>
              {item.text}
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

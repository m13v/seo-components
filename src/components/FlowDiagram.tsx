"use client";

import { motion } from "framer-motion";

interface FlowStep {
  label: string;
  detail?: string;
  icon?: "browser" | "server" | "redirect" | "iframe" | "webhook" | "lock" | "check" | "error" | "wallet" | "email";
}

interface FlowDiagramProps {
  title: string;
  steps: FlowStep[];
}

const icons: Record<string, string> = {
  browser: "\uD83C\uDF10",
  server: "\u2699\uFE0F",
  redirect: "\u21AA\uFE0F",
  iframe: "\uD83D\uDCE6",
  webhook: "\uD83D\uDD14",
  lock: "\uD83D\uDD12",
  check: "\u2705",
  error: "\u274C",
  wallet: "\uD83D\uDCB3",
  email: "\uD83D\uDCE7",
};

export function FlowDiagram({ title, steps }: FlowDiagramProps) {
  return (
    <div className="my-10 rounded-2xl border border-[color-mix(in_srgb,currentColor_14%,transparent)] bg-[color-mix(in_srgb,currentColor_4%,transparent)] p-6 overflow-x-auto">
      <p className="text-xs font-mono uppercase tracking-widest text-emerald-500 mb-5">
        {title}
      </p>
      <div className="flex items-start justify-between w-full">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            className="flex items-start"
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1],
              delay: i * 0.08,
            }}
          >
            <div className="flex flex-col items-center flex-1 min-w-0 max-w-[180px]">
              <div className="w-11 h-11 rounded-xl bg-[color-mix(in_srgb,currentColor_4%,transparent)] border border-[color-mix(in_srgb,currentColor_14%,transparent)] flex items-center justify-center text-lg mb-2">
                {step.icon ? icons[step.icon] || "\u2022" : `${i + 1}`}
              </div>
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 text-center leading-tight">
                {step.label}
              </p>
              {step.detail && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center leading-tight mt-1">
                  {step.detail}
                </p>
              )}
            </div>
            {i < steps.length - 1 && (
              <motion.div
                className="flex items-center h-11 shrink-0"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.25,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.08 + 0.15,
                }}
                style={{ originX: 0 }}
              >
                <svg width="32" height="12" viewBox="0 0 32 12" className="text-zinc-500 dark:text-zinc-400">
                  <line x1="0" y1="6" x2="24" y2="6" stroke="currentColor" strokeWidth="1.5" />
                  <polygon points="24,2 32,6 24,10" fill="currentColor" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

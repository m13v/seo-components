"use client";

import { motion } from "framer-motion";

export interface StepperStep {
  title: string;
  description?: string;
}

interface HorizontalStepperProps {
  title?: string;
  steps: StepperStep[];
  current?: number;
  className?: string;
}

export function HorizontalStepper({
  title,
  steps,
  current = 0,
  className = "",
}: HorizontalStepperProps) {
  return (
    <div className={`my-10 ${className}`}>
      {title && (
        <motion.h3
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </motion.h3>
      )}
      <ol className="flex items-start">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const isLast = i === steps.length - 1;
          return (
            <li
              key={`${s.title}-${i}`}
              className={`flex items-start ${isLast ? "flex-none" : "flex-1"}`}
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
                className="flex flex-col items-center"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                    done
                      ? "border-teal-400 bg-teal-400 text-white"
                      : active
                      ? "border-teal-400 bg-[color-mix(in_srgb,currentColor_4%,transparent)] text-teal-600 dark:text-teal-400"
                      : "border-[color-mix(in_srgb,currentColor_20%,transparent)] bg-[color-mix(in_srgb,currentColor_6%,transparent)] text-zinc-500 dark:text-zinc-500"
                  }`}
                >
                  {done ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <div className="mt-3 max-w-[9rem] text-center">
                  <p
                    className={`text-xs font-medium ${
                      active
                        ? "text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {s.title}
                  </p>
                  {s.description && (
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {s.description}
                    </p>
                  )}
                </div>
              </motion.div>
              {!isLast && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 + 0.1 }}
                  className={`mt-5 h-px flex-1 origin-left ${
                    done
                      ? "bg-teal-400"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

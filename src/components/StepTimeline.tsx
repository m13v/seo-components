"use client";

import { motion } from "framer-motion";

interface TimelineStep {
  title: string;
  description: string;
  icon?: string;
  detail?: React.ReactNode;
}

interface StepTimelineProps {
  title?: string;
  steps: TimelineStep[];
  className?: string;
}

/**
 * Vertical timeline with animated step reveals.
 * Each step connects via an animated line that draws downward.
 */
export function StepTimeline({
  title,
  steps,
  className = "",
}: StepTimelineProps) {
  return (
    <div className={`my-10 ${className}`}>
      {title && (
        <motion.h3
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6"
        >
          {title}
        </motion.h3>
      )}

      <div className="relative pl-8">
        {/* Vertical line */}
        <motion.div
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-teal-400 via-teal-300 to-zinc-200 origin-top"
        />

        <div className="space-y-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
                delay: i * 0.1,
              }}
              className="relative"
            >
              {/* Dot */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.3,
                  delay: i * 0.1 + 0.15,
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-teal-50 dark:bg-teal-900/30 border-2 border-teal-400 flex items-center justify-center"
              >
                {step.icon ? (
                  <span className="text-xs">{step.icon}</span>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                    {i + 1}
                  </span>
                )}
              </motion.div>

              {/* Content */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  {step.title}
                </h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
                {step.detail && (
                  <div className="mt-3 rounded-lg border border-[color-mix(in_srgb,currentColor_10%,transparent)] bg-[color-mix(in_srgb,currentColor_3%,transparent)] p-3 text-sm">
                    {step.detail}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

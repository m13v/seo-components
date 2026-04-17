"use client";

import { motion } from "framer-motion";

interface InlineCtaProps {
  heading: string;
  body: string;
  linkText?: string;
  href?: string;
}

export function InlineCta({
  heading,
  body,
  linkText = "Get Started",
  href = "#",
}: InlineCtaProps) {
  return (
    <motion.div
      className="my-12 mx-auto max-w-2xl p-6 rounded-2xl border border-teal-100 dark:border-teal-800/60 bg-teal-50/30 dark:bg-teal-950/60"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="text-sm font-semibold text-teal-600 dark:text-teal-300 mb-2">
        {heading}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-4">
        {body}
      </p>
      <a
        href={href}
        className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 dark:text-teal-300 hover:text-accent-dim transition-colors"
        onClick={() => {
          const w = typeof window !== "undefined" ? (window as unknown as { posthog?: { capture: (e: string, p?: Record<string, unknown>) => void } }) : undefined;
          w?.posthog?.capture("cta_clicked", {
            component: "InlineCta",
            heading,
            label: linkText,
            destination: href,
            page: typeof window !== "undefined" ? window.location.pathname : undefined,
          });
        }}
      >
        {linkText} <span>&rarr;</span>
      </a>
    </motion.div>
  );
}

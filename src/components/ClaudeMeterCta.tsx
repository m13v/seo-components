"use client";

import { motion } from "framer-motion";
import { trackCrossProductClick } from "../lib/track";

export interface ClaudeMeterCtaProps {
  /** Placement tag, kept in analytics payload. */
  placement?: "top" | "bottom" | "inline";
  /** Override the destination URL. Defaults to the install page. */
  href?: string;
  /** Site slug for canonical analytics (e.g. "fazm"). */
  site?: string;
  /** Section label for canonical analytics. */
  section?: string;
}

const FEATURES = [
  "Rolling 5-hour window",
  "Weekly quota %",
  "Extra-usage $ balance",
  "Free · MIT · no telemetry",
];

export function ClaudeMeterCta({
  placement = "inline",
  href = "https://claude-meter.com/install",
  site,
  section,
}: ClaudeMeterCtaProps) {
  const sectionLabel = section ?? `claude-meter-cta-${placement}`;

  const handleClick = () => {
    trackCrossProductClick({
      destination: href,
      site,
      targetProduct: "claude-meter",
      section: sectionLabel,
      text: "Install Claude Meter",
      component: "ClaudeMeterCta",
      extra: { placement },
    });
  };

  return (
    <motion.aside
      className="not-prose my-10 mx-auto w-full max-w-4xl"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Claude Meter promotion"
    >
      <div className="relative overflow-hidden rounded-3xl border border-teal-200/70 dark:border-teal-700/50 bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-teal-950/80 dark:via-zinc-950 dark:to-cyan-950/60 p-6 sm:p-10 shadow-xl">
        <ShimmerBorder />
        <GlowBlob className="-top-24 -left-16 bg-teal-400/40 dark:bg-teal-500/20" />
        <GlowBlob
          className="-bottom-24 -right-16 bg-cyan-400/40 dark:bg-cyan-500/20"
          delay={1.2}
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <LiveDot />
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                Claude Meter
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight mb-3">
              Stop guessing when your Claude limit resets.
            </h2>

            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6 max-w-2xl">
              A free macOS menu bar app and browser extension that shows your{" "}
              <strong className="text-zinc-900 dark:text-white">
                live Claude Pro and Max usage
              </strong>
              : rolling 5-hour window, weekly quota percent, and extra-usage
              dollar balance. Same server-truth numbers as{" "}
              <code className="text-sm px-1.5 py-0.5 rounded bg-teal-100/70 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200">
                claude.ai/settings/usage
              </code>
              , matched exactly.
            </p>

            <ul className="flex flex-wrap gap-2 mb-0">
              {FEATURES.map((f) => (
                <li
                  key={f}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-[color-mix(in_srgb,currentColor_4%,transparent)] border border-teal-200/70 dark:border-teal-800/60 text-zinc-700 dark:text-zinc-200"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
            <motion.a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClick}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="relative inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-base sm:text-lg font-semibold shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-shadow overflow-hidden"
            >
              <ButtonShimmer />
              <span className="relative z-10">Install Claude Meter</span>
              <ArrowGlyph />
            </motion.a>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 lg:text-right">
              macOS 12+ · Chrome, Arc, Brave, Edge
            </p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function ShimmerBorder() {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-3xl"
      style={{
        background:
          "linear-gradient(120deg, transparent 30%, rgba(45, 212, 191, 0.35) 50%, transparent 70%)",
        backgroundSize: "200% 200%",
      }}
      animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
    />
  );
}

function GlowBlob({
  className,
  delay = 0,
}: {
  className: string;
  delay?: number;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute h-64 w-64 rounded-full blur-3xl ${className}`}
      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
      transition={{ duration: 4, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

function LiveDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-teal-400"
        animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
    </span>
  );
}

function ButtonShimmer() {
  return (
    <motion.span
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)",
        backgroundSize: "250% 100%",
      }}
      animate={{ backgroundPosition: ["200% 0%", "-50% 0%"] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
    />
  );
}

function ArrowGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="relative z-10"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

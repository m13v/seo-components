"use client";

import { motion } from "framer-motion";

interface GradientTextProps {
  children: React.ReactNode;
  /** "teal" (default) uses cyan → teal brand gradient. "rainbow" uses a wider cyan/teal/emerald spread. */
  variant?: "teal" | "rainbow";
  /** Animate the gradient sliding horizontally */
  animate?: boolean;
  className?: string;
}

/**
 * Gradient text treatment for hero headings or standout words.
 * Stays on-brand (teal/cyan, never violet). Optional animated
 * background-position shift creates a subtle moving gradient.
 */
export function GradientText({
  children,
  variant = "teal",
  animate = true,
  className = "",
}: GradientTextProps) {
  const gradient =
    variant === "rainbow"
      ? "linear-gradient(90deg, var(--seo-accent-gradient-from, #06b6d4), var(--seo-accent, #14b8a6), #10b981, var(--seo-accent, #14b8a6), var(--seo-accent-gradient-from, #06b6d4))"
      : "linear-gradient(90deg, var(--seo-accent-gradient-from, #06b6d4), var(--seo-accent, #14b8a6), var(--seo-accent-dark, #0d9488), var(--seo-accent, #14b8a6), var(--seo-accent-gradient-from, #06b6d4))";

  return (
    <motion.span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: gradient,
        backgroundSize: "200% 100%",
      }}
      animate={animate ? { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] } : undefined}
      transition={animate ? { duration: 6, ease: "linear", repeat: Infinity } : undefined}
    >
      {children}
    </motion.span>
  );
}

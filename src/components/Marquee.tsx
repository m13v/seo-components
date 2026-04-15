"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface MarqueeProps {
  children: React.ReactNode;
  /** Duration of one full cycle in seconds. Lower = faster. */
  speed?: number;
  /** Reverse direction */
  reverse?: boolean;
  /** Pause on hover */
  pauseOnHover?: boolean;
  /** Fade edges for soft bleed */
  fade?: boolean;
  className?: string;
}

/**
 * Infinite horizontal marquee. Duplicates children twice and
 * translates the wrapper 50% so the loop is seamless. Wrap
 * anything: logos, testimonials, tags, chips, metric cards.
 */
export function Marquee({
  children,
  speed = 30,
  reverse = false,
  pauseOnHover = true,
  fade = true,
  className = "",
}: MarqueeProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={`relative overflow-hidden my-8 ${className}`}
      onMouseEnter={() => pauseOnHover && setHover(true)}
      onMouseLeave={() => pauseOnHover && setHover(false)}
      style={{
        maskImage: fade
          ? "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)"
          : undefined,
        WebkitMaskImage: fade
          ? "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)"
          : undefined,
      }}
    >
      <motion.div
        className="flex gap-6 w-max"
        animate={{
          x: reverse ? ["-50%", "0%"] : ["0%", "-50%"],
        }}
        transition={{
          duration: speed,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{ animationPlayState: hover ? "paused" : "running" }}
      >
        <div className="flex gap-6 shrink-0">{children}</div>
        <div className="flex gap-6 shrink-0" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

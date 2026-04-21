"use client";

import { motion } from "framer-motion";

interface OrbitingCirclesProps {
  /** Center element (logo, icon, label) */
  center: React.ReactNode;
  /** Items orbiting around the center */
  items: React.ReactNode[];
  /** Radius in pixels */
  radius?: number;
  /** Duration of one full revolution in seconds */
  duration?: number;
  /** Reverse spin direction */
  reverse?: boolean;
  className?: string;
}

/**
 * Magic UI style orbiting element. A central element with smaller
 * items circling around it. Useful for "ecosystem" or "integrations"
 * showcases where the center is the product and orbits are
 * connected tools.
 */
export function OrbitingCircles({
  center,
  items,
  radius = 140,
  duration = 20,
  reverse = false,
  className = "",
}: OrbitingCirclesProps) {
  const size = radius * 2 + 80;

  return (
    <div
      className={`my-10 relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size, maxWidth: "100%", margin: "2.5rem auto" }}
    >
      {/* Orbit ring */}
      <div
        className="absolute rounded-full border border-dashed border-[color-mix(in_srgb,currentColor_14%,transparent)]"
        style={{ width: radius * 2, height: radius * 2 }}
      />

      {/* Center */}
      <div className="relative z-10 flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white font-semibold shadow-lg shadow-teal-500/30"
        style={{ width: 96, height: 96 }}
      >
        {center}
      </div>

      {/* Orbiting items */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: reverse ? -360 : 360 }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        {items.map((item, i) => {
          const angle = (i * 360) / items.length;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          return (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 flex items-center justify-center rounded-xl bg-[color-mix(in_srgb,currentColor_4%,transparent)] border border-[color-mix(in_srgb,currentColor_14%,transparent)] shadow-sm text-xs font-medium text-zinc-700 dark:text-zinc-300"
              style={{
                width: 64,
                height: 64,
                transform: `translate(${x - 32}px, ${y - 32}px)`,
              }}
              animate={{ rotate: reverse ? 360 : -360 }}
              transition={{ duration, ease: "linear", repeat: Infinity }}
            >
              {item}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

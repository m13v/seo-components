"use client";

import React from "react";

/**
 * ShineBorder: wraps children in a container with an animated radial-gradient
 * border that rotates continuously, creating a "shine" effect. Defaults to a
 * teal glow. Use it around cards, CTAs, or featured sections.
 *
 * Requires the `shine-pulse` keyframe in your Tailwind config:
 * ```
 * keyframes: {
 *   "shine-pulse": {
 *     "0%": { "background-position": "0% 0%" },
 *     "50%": { "background-position": "100% 100%" },
 *     to: { "background-position": "0% 0%" },
 *   },
 * }
 * ```
 *
 * @example
 * <ShineBorder color="#14b8a6">
 *   <p>Featured content</p>
 * </ShineBorder>
 */

type TColorProp = `#${string}` | `#${string}`[];

interface ShineBorderProps {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  /** Hex color(s) for the shine gradient. Pass your brand accent color. Defaults to teal.
   *  CSS custom properties are not supported here (conic gradient border trick). */
  color?: TColorProp;
  className?: string;
  children: React.ReactNode;
}

export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = "#14b8a6",
  className,
  children,
}: ShineBorderProps) {
  const outerBase =
    "relative grid min-h-[60px] w-fit min-w-[300px] place-items-center bg-white dark:bg-zinc-900 p-3 text-zinc-900 dark:text-zinc-100";
  const outerClass = className
    ? `${outerBase} ${className}`
    : outerBase;

  return (
    <div
      style={
        {
          "--border-radius": `${borderRadius}px`,
          borderRadius: `${borderRadius}px`,
        } as React.CSSProperties
      }
      className={outerClass}
    >
      <div
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--border-radius": `${borderRadius}px`,
            "--border-radius-child": `${borderRadius * 0.2}px`,
            "--shine-pulse-duration": `${duration}s`,
            "--mask-linear-gradient":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "--background-radial-gradient": `radial-gradient(transparent,transparent, ${
              Array.isArray(color) ? color.join(",") : color
            },transparent,transparent)`,
          } as React.CSSProperties
        }
        className="before:bg-shine-size before:absolute before:inset-[0] before:aspect-square before:h-full before:w-full before:rounded-[--border-radius] before:p-[--border-width] before:will-change-[background-position] before:content-[''] before:![-webkit-mask-composite:xor] before:![mask-composite:exclude] before:[background-image:var(--background-radial-gradient)] before:[background-size:300%_300%] before:[mask:var(--mask-linear-gradient)] motion-safe:before:animate-[shine-pulse_var(--shine-pulse-duration)_infinite_linear]"
      />
      <div
        className="z-[1] h-full w-full"
        style={{ borderRadius: `${borderRadius * 0.2}px` }}
      >
        {children}
      </div>
    </div>
  );
}

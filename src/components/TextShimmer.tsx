"use client";

import { CSSProperties, ReactNode } from "react";

/**
 * TextShimmer: renders inline text with a teal shimmer highlight that
 * sweeps across continuously. Useful for drawing attention to a tagline,
 * status label, or short phrase.
 *
 * Requires the `shimmer` keyframe in your Tailwind config:
 * ```
 * keyframes: {
 *   shimmer: {
 *     "0%, 90%, 100%": {
 *       "background-position": "calc(-100% - var(--shimmer-width)) 0",
 *     },
 *     "30%, 60%": {
 *       "background-position": "calc(100% + var(--shimmer-width)) 0",
 *     },
 *   },
 * },
 * animation: { shimmer: "shimmer 8s infinite" }
 * ```
 *
 * @example
 * <TextShimmer>Now in beta</TextShimmer>
 */

interface TextShimmerProps {
  children: ReactNode;
  className?: string;
  /** Width of the shimmer highlight in pixels. */
  shimmerWidth?: number;
}

export function TextShimmer({
  children,
  className,
  shimmerWidth = 100,
}: TextShimmerProps) {
  const base = [
    "mx-auto max-w-md text-zinc-500",
    "animate-shimmer bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shimmer-width)_100%] [transition:background-position_1s_cubic-bezier(.6,.6,0,1)_infinite]",
    "bg-gradient-to-r from-zinc-100 via-teal-600/80 via-50% to-zinc-100",
  ].join(" ");

  return (
    <p
      style={
        {
          "--shimmer-width": `${shimmerWidth}px`,
        } as CSSProperties
      }
      className={className ? `${base} ${className}` : base}
    >
      {children}
    </p>
  );
}

"use client";

import Link from "next/link";

interface ShimmerButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Magic UI style shimmer button. A continuous light shimmer sweeps
 * across the button surface. Uses plain CSS keyframes with a
 * diagonal linear-gradient mask so it works without extra deps.
 */
export function ShimmerButton({
  children,
  href,
  onClick,
  className = "",
}: ShimmerButtonProps) {
  const inner = (
    <span
      className={`relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-transform hover:scale-[1.02] ${className}`}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="inline-block">
      {inner}
    </button>
  );
}

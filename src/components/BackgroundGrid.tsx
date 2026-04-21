"use client";

interface BackgroundGridProps {
  children: React.ReactNode;
  /** Grid cell size in pixels */
  size?: number;
  /** "dots" or "lines" */
  pattern?: "dots" | "lines";
  /** Add a radial teal glow behind the content */
  glow?: boolean;
  className?: string;
}

/**
 * Vercel/Linear style background with a subtle grid pattern and
 * optional radial glow. Use as a wrapper around hero sections or
 * standout callouts. Inner content renders with full z-index above
 * the pattern.
 */
export function BackgroundGrid({
  children,
  size = 36,
  pattern = "dots",
  glow = true,
  className = "",
}: BackgroundGridProps) {
  const bg =
    pattern === "dots"
      ? `radial-gradient(circle, rgba(var(--seo-accent-rgb, 20, 184, 166), 0.18) 1px, transparent 1px)`
      : `linear-gradient(rgba(var(--seo-accent-rgb, 20, 184, 166), 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--seo-accent-rgb, 20, 184, 166), 0.12) 1px, transparent 1px)`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,currentColor_14%,transparent)] my-10 ${className}`}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: bg,
          backgroundSize: `${size}px ${size}px`,
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />
      {glow && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(var(--seo-accent-rgb, 20, 184, 166), 0.15) 0%, transparent 60%)",
          }}
        />
      )}
      <div className="relative z-10 p-8 md:p-12">{children}</div>
    </div>
  );
}

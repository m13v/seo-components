"use client";

import { motion } from "framer-motion";

export interface IntegrationItem {
  name: string;
  description?: string;
  initial?: string;
  logoUrl?: string;
  href?: string;
  accent?: string;
}

interface IntegrationsGridProps {
  title?: string;
  subtitle?: string;
  items: IntegrationItem[];
  columns?: 3 | 4;
  className?: string;
}

export function IntegrationsGrid({
  title,
  subtitle,
  items,
  columns = 4,
  className = "",
}: IntegrationsGridProps) {
  const gridCols =
    columns === 3
      ? "grid-cols-2 sm:grid-cols-3"
      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  return (
    <div className={`my-10 ${className}`}>
      {(title || subtitle) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          {subtitle && (
            <p className="text-xs font-medium uppercase tracking-wider text-teal-600 dark:text-teal-400">
              {subtitle}
            </p>
          )}
          {title && (
            <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
          )}
        </motion.div>
      )}
      <div className={`grid gap-3 ${gridCols}`}>
        {items.map((it, i) => {
          const initial =
            it.initial || it.name.trim().slice(0, 1).toUpperCase();
          const Wrapper: React.ElementType = it.href ? "a" : "div";
          const wrapperProps = it.href
            ? { href: it.href, target: "_blank", rel: "noopener noreferrer" }
            : {};
          return (
            <motion.div
              key={`${it.name}-${i}`}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
            >
              <Wrapper
                {...wrapperProps}
                className="group flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,currentColor_14%,transparent)] bg-[color-mix(in_srgb,currentColor_3%,transparent)] p-4 transition-all hover:border-teal-300 hover:shadow-md"
              >
                {it.logoUrl ? (
                  <img
                    src={it.logoUrl}
                    alt={it.name}
                    className="h-9 w-9 flex-shrink-0 rounded-md object-contain"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
                    style={{
                      background:
                        it.accent ||
                        "linear-gradient(135deg, var(--seo-accent, #14b8a6), var(--seo-accent-2, #22d3ee))",
                    }}
                    aria-hidden="true"
                  >
                    {initial}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {it.name}
                  </p>
                  {it.description && (
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {it.description}
                    </p>
                  )}
                </div>
              </Wrapper>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

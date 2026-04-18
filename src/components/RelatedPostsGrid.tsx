"use client";

import { motion } from "framer-motion";

export interface RelatedPost {
  title: string;
  href: string;
  excerpt?: string;
  tag?: string;
  readTime?: string;
}

interface RelatedPostsGridProps {
  title?: string;
  subtitle?: string;
  posts: RelatedPost[];
  className?: string;
}

export function RelatedPostsGrid({
  title = "Keep reading",
  subtitle,
  posts,
  className = "",
}: RelatedPostsGridProps) {
  return (
    <div className={`my-10 ${className}`}>
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
        <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
      </motion.div>
      <div className="grid gap-4 md:grid-cols-3">
        {posts.map((p, i) => {
          const internal = p.href.startsWith("/") || p.href.startsWith("#");
          const linkProps = internal
            ? {}
            : { target: "_blank", rel: "noopener noreferrer" };
          return (
            <motion.a
              key={`${p.href}-${i}`}
              href={p.href}
              {...linkProps}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 transition-all hover:border-teal-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <div className="h-28 bg-gradient-to-br from-teal-400/20 via-cyan-400/15 to-zinc-50 dark:to-zinc-900" />
              <div className="flex flex-1 flex-col gap-2 p-5">
                {p.tag && (
                  <span className="self-start rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                    {p.tag}
                  </span>
                )}
                <h4 className="text-sm font-semibold leading-snug text-zinc-900 group-hover:text-teal-600 dark:text-zinc-100 dark:group-hover:text-teal-400">
                  {p.title}
                </h4>
                {p.excerpt && (
                  <p className="line-clamp-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {p.excerpt}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {p.readTime && <span>{p.readTime}</span>}
                  <span className="inline-flex items-center gap-1 font-medium text-teal-600 group-hover:gap-2 dark:text-teal-400">
                    Read
                    <svg
                      className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </div>
              </div>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}

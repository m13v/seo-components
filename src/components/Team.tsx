"use client";

import { motion } from "framer-motion";

export interface TeamMember {
  name: string;
  role: string;
  initials?: string;
  bio?: string;
  avatarUrl?: string;
  href?: string;
}

interface TeamProps {
  title?: string;
  subtitle?: string;
  members: TeamMember[];
  className?: string;
}

export function Team({ title, subtitle, members, className = "" }: TeamProps) {
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {members.map((m, i) => {
          const initials =
            m.initials ||
            m.name
              .split(/\s+/)
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();
          const Wrapper: React.ElementType = m.href ? "a" : "div";
          const wrapperProps = m.href
            ? { href: m.href, target: "_blank", rel: "noopener noreferrer" }
            : {};
          return (
            <motion.div
              key={`${m.name}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
            >
              <Wrapper
                {...wrapperProps}
                className="group flex flex-col items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-center transition-all hover:border-teal-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                {m.avatarUrl ? (
                  <img
                    src={m.avatarUrl}
                    alt={m.name}
                    className="h-16 w-16 rounded-full border-2 border-white object-cover dark:border-zinc-800"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-500/30 text-base font-semibold text-teal-700 dark:text-teal-300">
                    {initials}
                  </div>
                )}
                <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {m.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.role}</p>
                {m.bio && (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {m.bio}
                  </p>
                )}
              </Wrapper>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

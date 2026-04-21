"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackScheduleClick, withBookingAttribution } from "../lib/track";

/**
 * Render the bare destination for SSR, then swap in the UTM-attributed URL
 * after hydration so Cmd+Click / middle-click preserves the attribution.
 * PostHog's `schedule_click` event still receives the bare destination so
 * aggregation isn't fragmented per page.
 */
function useBookingHref(destination: string): string {
  const [href, setHref] = useState(destination);
  useEffect(() => {
    setHref(withBookingAttribution(destination));
  }, [destination]);
  return href;
}

export type BookCallAppearance = "inline" | "sticky" | "hero" | "footer";

export interface BookCallCTAProps {
  destination: string;
  appearance?: BookCallAppearance;
  text?: string;
  heading?: string;
  description?: string;
  section?: string;
  site?: string;
  scrollThreshold?: number;
}

export function BookCallCTA({
  destination,
  appearance = "inline",
  text = "Book a call",
  heading,
  description,
  section,
  site,
  scrollThreshold = 800,
}: BookCallCTAProps) {
  if (appearance === "sticky") {
    return (
      <StickyBookCall
        destination={destination}
        text={text}
        description={description ?? "Talk to the team and see it live."}
        section={section ?? "book-call-sticky"}
        site={site}
        scrollThreshold={scrollThreshold}
      />
    );
  }

  if (appearance === "hero") {
    return (
      <HeroBookCall
        destination={destination}
        text={text}
        section={section ?? "book-call-hero"}
        site={site}
      />
    );
  }

  if (appearance === "footer") {
    return (
      <FooterBookCall
        destination={destination}
        text={text}
        heading={heading ?? "Ready to see it live?"}
        description={
          description ?? "Book a 20-minute walkthrough with the team."
        }
        section={section ?? "book-call-footer"}
        site={site}
      />
    );
  }

  return (
    <InlineBookCall
      destination={destination}
      text={text}
      heading={heading ?? "Want a live walkthrough?"}
      description={
        description ?? "Book a 20-minute call and we'll show you the product end-to-end."
      }
      section={section ?? "book-call-inline"}
      site={site}
    />
  );
}

function fire(
  destination: string,
  text: string,
  section: string,
  site: string | undefined,
  component: string,
) {
  trackScheduleClick({
    destination,
    site,
    section,
    text,
    component,
  });
}

function InlineBookCall({
  destination,
  text,
  heading,
  description,
  section,
  site,
}: {
  destination: string;
  text: string;
  heading: string;
  description: string;
  section: string;
  site?: string;
}) {
  const href = useBookingHref(destination);
  return (
    <motion.div
      className="my-12 mx-auto max-w-2xl p-6 rounded-2xl border border-teal-100 dark:border-teal-800/60 bg-teal-50/40 dark:bg-teal-950/60"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="text-sm font-semibold text-teal-600 dark:text-teal-300 mb-2">
        {heading}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-4">
        {description}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors"
        onClick={() =>
          fire(destination, text, section, site, "BookCallCTA.inline")
        }
      >
        {text} <span>&rarr;</span>
      </a>
    </motion.div>
  );
}

function HeroBookCall({
  destination,
  text,
  section,
  site,
}: {
  destination: string;
  text: string;
  section: string;
  site?: string;
}) {
  const href = useBookingHref(destination);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-teal-200 dark:border-teal-800/60 text-sm font-medium text-teal-700 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors"
      onClick={() =>
        fire(destination, text, section, site, "BookCallCTA.hero")
      }
    >
      {text} <span>&rarr;</span>
    </a>
  );
}

function FooterBookCall({
  destination,
  text,
  heading,
  description,
  section,
  site,
}: {
  destination: string;
  text: string;
  heading: string;
  description: string;
  section: string;
  site?: string;
}) {
  const href = useBookingHref(destination);
  return (
    <motion.div
      className="my-16 mx-auto max-w-3xl p-8 rounded-2xl border border-teal-200 dark:border-teal-800/60 bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/70 dark:to-zinc-950 text-center"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        {heading}
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-6">
        {description}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors text-sm font-medium"
        onClick={() =>
          fire(destination, text, section, site, "BookCallCTA.footer")
        }
      >
        {text} <span>&rarr;</span>
      </a>
    </motion.div>
  );
}

function StickyBookCall({
  destination,
  text,
  description,
  section,
  site,
  scrollThreshold,
}: {
  destination: string;
  text: string;
  description: string;
  section: string;
  site?: string;
  scrollThreshold: number;
}) {
  const [visible, setVisible] = useState(false);
  const href = useBookingHref(destination);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > scrollThreshold);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, [scrollThreshold]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color-mix(in_srgb,currentColor_14%,transparent)] backdrop-blur-xl py-3 px-6"
          style={{ backgroundColor: "var(--mobile-bg)" }}
        >
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <p className="text-sm text-zinc-500 hidden sm:block">
              {description}
            </p>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors"
              onClick={() =>
                fire(destination, text, section, site, "BookCallCTA.sticky")
              }
            >
              {text}
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

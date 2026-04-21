"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackGetStartedClick } from "../lib/track";

export type GetStartedCTAAppearance = "inline" | "sticky" | "hero" | "footer";

export interface GetStartedCTAProps {
  destination: string;
  appearance?: GetStartedCTAAppearance;
  text?: string;
  heading?: string;
  description?: string;
  section?: string;
  site?: string;
  scrollThreshold?: number;
}

export function GetStartedCTA({
  destination,
  appearance = "inline",
  text = "Get started",
  heading,
  description,
  section,
  site,
  scrollThreshold = 800,
}: GetStartedCTAProps) {
  if (appearance === "sticky") {
    return (
      <StickyGetStarted
        destination={destination}
        text={text}
        description={description ?? "Jump in, takes under a minute."}
        section={section ?? "get-started-sticky"}
        site={site}
        scrollThreshold={scrollThreshold}
      />
    );
  }

  if (appearance === "hero") {
    return (
      <HeroGetStarted
        destination={destination}
        text={text}
        section={section ?? "get-started-hero"}
        site={site}
      />
    );
  }

  if (appearance === "footer") {
    return (
      <FooterGetStarted
        destination={destination}
        text={text}
        heading={heading ?? "Ready to start?"}
        description={description ?? "Free to try. No credit card needed."}
        section={section ?? "get-started-footer"}
        site={site}
      />
    );
  }

  return (
    <InlineGetStarted
      destination={destination}
      text={text}
      heading={heading ?? "Want to try it now?"}
      description={description ?? "Jump in, takes under a minute."}
      section={section ?? "get-started-inline"}
      site={site}
    />
  );
}

/** @deprecated Use `GetStartedCTA` instead. Alias kept for backward compat. */
export const DownloadCTA = GetStartedCTA;
/** @deprecated Use `GetStartedCTAProps` instead. */
export type DownloadCTAProps = GetStartedCTAProps;
/** @deprecated Use `GetStartedCTAAppearance` instead. */
export type DownloadCTAAppearance = GetStartedCTAAppearance;

function fire(
  destination: string,
  text: string,
  section: string,
  site: string | undefined,
  component: string,
) {
  trackGetStartedClick({
    destination,
    site,
    section,
    text,
    component,
  });
}

function InlineGetStarted({
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
        href={destination}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors"
        onClick={() =>
          fire(destination, text, section, site, "GetStartedCTA.inline")
        }
      >
        <ArrowGlyph /> {text}
      </a>
    </motion.div>
  );
}

function HeroGetStarted({
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
  return (
    <a
      href={destination}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-teal-200 dark:border-teal-800/60 text-sm font-medium text-teal-700 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors"
      onClick={() =>
        fire(destination, text, section, site, "GetStartedCTA.hero")
      }
    >
      <ArrowGlyph /> {text}
    </a>
  );
}

function FooterGetStarted({
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
        href={destination}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors text-sm font-medium"
        onClick={() =>
          fire(destination, text, section, site, "GetStartedCTA.footer")
        }
      >
        <ArrowGlyph /> {text}
      </a>
    </motion.div>
  );
}

function StickyGetStarted({
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
              href={destination}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors"
              onClick={() =>
                fire(destination, text, section, site, "GetStartedCTA.sticky")
              }
            >
              <ArrowGlyph /> {text}
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ArrowGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

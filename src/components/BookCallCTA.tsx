"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  identifyBookCallLead,
  trackScheduleClick,
  withBookingAttribution,
} from "../lib/track";
import { useCapture } from "../lib/analytics-context";

export type BookCallAppearance = "inline" | "sticky" | "hero" | "footer";

export interface BookCallCTAProps {
  /** Bare booking URL (e.g. `https://cal.com/team/mediar/fazm`). */
  destination: string;
  appearance?: BookCallAppearance;
  /** Primary button label. */
  text?: string;
  /** Optional heading (inline, footer). */
  heading?: string;
  /** Optional body copy (inline, sticky, footer). */
  description?: string;
  /** PostHog section label (e.g. "guide-footer"). */
  section?: string;
  /** Site slug, passed through to PostHog (e.g. "fazm"). */
  site?: string;
  /** Scroll threshold for the sticky variant. */
  scrollThreshold?: number;
  /**
   * API endpoint that accepts `{ email, destination, source_path, utm_* }`
   * and returns `{ ok, first_seen }`. Each consumer wires its own
   * `/api/book-call` via `createBookCallHandler` from
   * `@seo/components/server`.
   */
  endpoint?: string;
  /** Placeholder for the email input. */
  emailPlaceholder?: string;
  /** Label on the submit button (e.g. "Email me the link"). */
  submitLabel?: string;
  /**
   * Optional success message shown after submit. If omitted the user is
   * redirected to Cal/Calendly immediately without a confirmation.
   */
  successMessage?: string;
}

export function BookCallCTA(props: BookCallCTAProps) {
  const appearance = props.appearance ?? "inline";
  const site = props.site;
  const section = props.section ?? `book-call-${appearance}`;
  const text = props.text ?? "Book a call";

  if (appearance === "sticky") {
    return (
      <StickyBookCall
        {...props}
        text={text}
        description={props.description ?? "Talk to the team and see it live."}
        section={section}
        site={site}
        scrollThreshold={props.scrollThreshold ?? 800}
      />
    );
  }
  if (appearance === "hero") {
    return (
      <HeroBookCall
        {...props}
        text={text}
        section={section}
        site={site}
      />
    );
  }
  if (appearance === "footer") {
    return (
      <FooterBookCall
        {...props}
        text={text}
        heading={props.heading ?? "Ready to see it live?"}
        description={props.description ?? "Book a 20-minute walkthrough with the team."}
        section={section}
        site={site}
      />
    );
  }
  return (
    <InlineBookCall
      {...props}
      text={text}
      heading={props.heading ?? "Want a live walkthrough?"}
      description={
        props.description ??
        "Drop your email and we'll send a booking link so you can grab a time."
      }
      section={section}
      site={site}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Shared gate logic                                                  */
/* ------------------------------------------------------------------ */

type GateStatus = "idle" | "loading" | "error" | "success";

interface UseBookCallGateOptions {
  destination: string;
  endpoint: string;
  site?: string;
  section: string;
  text: string;
  component: string;
}

function useBookCallGate(opts: UseBookCallGateOptions) {
  const capture = useCapture();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<GateStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@")) {
        setErrorMsg("Please enter a valid email address.");
        setStatus("error");
        return;
      }
      setStatus("loading");
      setErrorMsg("");

      const sourcePath = typeof window !== "undefined" ? window.location.pathname : undefined;
      const sourceHost = typeof window !== "undefined" ? window.location.hostname : undefined;
      const calHref = withBookingAttribution(opts.destination);
      const finalUrl = (() => {
        try {
          const url = new URL(calHref);
          if (!url.searchParams.has("email")) url.searchParams.set("email", trimmed);
          return url.toString();
        } catch {
          const sep = opts.destination.includes("?") ? "&" : "?";
          return `${opts.destination}${sep}email=${encodeURIComponent(trimmed)}`;
        }
      })();

      try {
        const res = await fetch(opts.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmed,
            destination: opts.destination,
            source_path: sourcePath,
            source_host: sourceHost,
            utm_source: sourceHost,
            utm_medium: "schedule_click",
            utm_campaign: sourcePath,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorMsg(data.error || "Something went wrong. Please try again.");
          setStatus("error");
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { first_seen?: boolean };

        identifyBookCallLead(trimmed);

        if (data.first_seen) {
          capture("newsletter_subscribed", {
            component: opts.component,
            email: trimmed,
            page: sourcePath,
            source: "book_call",
          });
        }

        trackScheduleClick({
          destination: opts.destination,
          site: opts.site,
          section: opts.section,
          text: opts.text,
          component: opts.component,
          extra: { email: trimmed },
        });

        setStatus("success");
        // Give PostHog a moment to flush before redirecting.
        window.setTimeout(() => {
          window.location.href = finalUrl;
        }, 60);
      } catch {
        setErrorMsg("Network error. Please try again.");
        setStatus("error");
      }
    },
    [capture, email, opts.component, opts.destination, opts.endpoint, opts.section, opts.site, opts.text],
  );

  return { email, setEmail, status, errorMsg, submit };
}

/* ------------------------------------------------------------------ */
/*  Variants                                                           */
/* ------------------------------------------------------------------ */

function InlineBookCall({
  destination,
  text,
  heading,
  description,
  section,
  site,
  endpoint = "/api/book-call",
  emailPlaceholder = "you@example.com",
  submitLabel = "Email me the booking link",
  successMessage = "Check your inbox — we also opened the booking page in this tab.",
}: BookCallCTAProps & {
  text: string;
  heading: string;
  description: string;
  section: string;
}) {
  const gate = useBookCallGate({
    destination,
    endpoint,
    site,
    section,
    text,
    component: "BookCallCTA.inline",
  });

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
      {gate.status === "success" ? (
        <p className="text-sm font-medium text-teal-600 dark:text-teal-300">
          {successMessage}
        </p>
      ) : (
        <form onSubmit={gate.submit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={gate.email}
            onChange={(e) => gate.setEmail(e.target.value)}
            placeholder={emailPlaceholder}
            className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-[color-mix(in_srgb,currentColor_14%,transparent)] bg-[color-mix(in_srgb,currentColor_4%,transparent)] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-shadow"
            disabled={gate.status === "loading"}
            aria-label="Email address"
          />
          <button
            type="submit"
            disabled={gate.status === "loading"}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {gate.status === "loading" ? "..." : submitLabel} <span>&rarr;</span>
          </button>
        </form>
      )}
      {gate.status === "error" && gate.errorMsg && (
        <p className="mt-2 text-xs text-red-500">{gate.errorMsg}</p>
      )}
    </motion.div>
  );
}

function HeroBookCall({
  destination,
  text,
  section,
  site,
  endpoint = "/api/book-call",
  emailPlaceholder = "you@example.com",
  submitLabel,
}: BookCallCTAProps & {
  text: string;
  section: string;
}) {
  const [open, setOpen] = useState(false);
  const gate = useBookCallGate({
    destination,
    endpoint,
    site,
    section,
    text,
    component: "BookCallCTA.hero",
  });

  if (!open && gate.status !== "success") {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-teal-200 dark:border-teal-800/60 text-sm font-medium text-teal-700 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors"
      >
        {text} <span>&rarr;</span>
      </button>
    );
  }

  if (gate.status === "success") {
    return (
      <span className="text-sm font-medium text-teal-700 dark:text-teal-200">
        Opening the booking page…
      </span>
    );
  }

  return (
    <form onSubmit={gate.submit} className="inline-flex items-center gap-2">
      <input
        type="email"
        required
        autoFocus
        value={gate.email}
        onChange={(e) => gate.setEmail(e.target.value)}
        placeholder={emailPlaceholder}
        className="text-sm px-3 py-2 rounded-lg border border-[color-mix(in_srgb,currentColor_14%,transparent)] bg-[color-mix(in_srgb,currentColor_4%,transparent)] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
        disabled={gate.status === "loading"}
        aria-label="Email address"
      />
      <button
        type="submit"
        disabled={gate.status === "loading"}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-teal-700 dark:text-teal-200 border border-teal-200 dark:border-teal-800/60 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors disabled:opacity-60"
      >
        {gate.status === "loading" ? "..." : submitLabel ?? text}
      </button>
    </form>
  );
}

function FooterBookCall({
  destination,
  text,
  heading,
  description,
  section,
  site,
  endpoint = "/api/book-call",
  emailPlaceholder = "you@example.com",
  submitLabel = "Email me the booking link",
  successMessage = "Check your inbox — we also opened the booking page in this tab.",
}: BookCallCTAProps & {
  text: string;
  heading: string;
  description: string;
  section: string;
}) {
  const gate = useBookCallGate({
    destination,
    endpoint,
    site,
    section,
    text,
    component: "BookCallCTA.footer",
  });

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
      {gate.status === "success" ? (
        <p className="text-sm font-medium text-teal-600 dark:text-teal-300">
          {successMessage}
        </p>
      ) : (
        <form
          onSubmit={gate.submit}
          className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto"
        >
          <input
            type="email"
            required
            value={gate.email}
            onChange={(e) => gate.setEmail(e.target.value)}
            placeholder={emailPlaceholder}
            className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-[color-mix(in_srgb,currentColor_14%,transparent)] bg-[color-mix(in_srgb,currentColor_4%,transparent)] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-shadow"
            disabled={gate.status === "loading"}
            aria-label="Email address"
          />
          <button
            type="submit"
            disabled={gate.status === "loading"}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors text-sm font-medium disabled:opacity-60"
          >
            {gate.status === "loading" ? "..." : submitLabel} <span>&rarr;</span>
          </button>
        </form>
      )}
      {gate.status === "error" && gate.errorMsg && (
        <p className="mt-2 text-xs text-red-500">{gate.errorMsg}</p>
      )}
    </motion.div>
  );
}

function StickyBookCall({
  destination,
  text,
  description,
  section,
  site,
  scrollThreshold = 800,
  endpoint = "/api/book-call",
  emailPlaceholder = "you@example.com",
  submitLabel,
}: BookCallCTAProps & {
  text: string;
  description: string;
  section: string;
  scrollThreshold: number;
}) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const gate = useBookCallGate({
    destination,
    endpoint,
    site,
    section,
    text,
    component: "BookCallCTA.sticky",
  });

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > scrollThreshold);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, [scrollThreshold]);

  const showForm = expanded || gate.status === "loading" || gate.status === "error";
  const descCopy = useMemo(() => description, [description]);

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
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
            {gate.status === "success" ? (
              <p className="text-sm font-medium text-teal-600 dark:text-teal-300 flex-1">
                Opening the booking page…
              </p>
            ) : showForm ? (
              <form
                onSubmit={gate.submit}
                className="flex items-center gap-2 flex-1 md:min-w-[380px]"
              >
                <input
                  type="email"
                  required
                  autoFocus
                  value={gate.email}
                  onChange={(e) => gate.setEmail(e.target.value)}
                  placeholder={emailPlaceholder}
                  className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-[color-mix(in_srgb,currentColor_14%,transparent)] bg-[color-mix(in_srgb,currentColor_4%,transparent)] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                  disabled={gate.status === "loading"}
                  aria-label="Email address"
                />
                <button
                  type="submit"
                  disabled={gate.status === "loading"}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {gate.status === "loading" ? "..." : submitLabel ?? text}
                </button>
              </form>
            ) : (
              <>
                <p className="text-sm text-zinc-500 hidden sm:block">
                  {descCopy}
                </p>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-teal-500 text-accent-contrast hover:bg-accent-dim transition-colors"
                >
                  {text}
                </button>
              </>
            )}
          </div>
          {gate.status === "error" && gate.errorMsg && (
            <div className="mx-auto max-w-7xl mt-1">
              <p className="text-xs text-red-500">{gate.errorMsg}</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

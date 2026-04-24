"use client";

import { useEffect, useState } from "react";
import { captureFromWindow } from "../lib/analytics-context";
import { trackScheduleClick, withBookingAttribution } from "../lib/track";

export interface SiteNavbarProps {
  /** Brand display name. Shown as plain text if `brandLogo` is omitted. */
  brandName: string;
  /** Optional custom brand element (logo component, styled text with accent
   *  dot, etc.). When provided, takes precedence over `brandName`. */
  brandLogo?: React.ReactNode;
  /** Home link target. Default: "/". */
  homeHref?: string;
  /** CTA button label (e.g. "Book a Demo", "Get Started Free"). */
  ctaLabel: string;
  /** CTA destination URL. If it looks like a Cal.com or Calendly link,
   *  `withBookingAttribution` is applied automatically and `schedule_click`
   *  is fired in PostHog. */
  ctaHref: string;
  /** Tailwind classes for the CTA button (bg, hover, text). Pass as a
   *  literal string so the consumer's Tailwind scanner sees it. Default
   *  uses the `--accent` CSS variable chain (`bg-accent
   *  text-accent-contrast hover:bg-accent-dim`). */
  ctaClassName?: string;
  /** Extra classes merged onto the outer <nav> (for background overrides,
   *  extra borders, etc.). Defaults adapt to light/dark via Tailwind's
   *  `dark:` variant. */
  className?: string;
  /** Site slug for analytics (e.g. "fazm", "assrt", "cyrano"). Optional:
   *  PostHog `$host` already identifies the site. */
  site?: string;
  /** Force CTA treatment. Default "auto" detects Cal.com / Calendly URLs
   *  and treats them as scheduling CTAs. Use "get-started" for signup /
   *  install / download links. */
  ctaKind?: "auto" | "schedule" | "get-started";
}

function isBookingUrl(url: string): boolean {
  return /(?:^|\/\/|\.)(?:cal\.com|calendly\.com)(?:\/|$)/i.test(url);
}

/**
 * Sticky top navbar shared across every SEO page. Mount once in the site's
 * intermediate layout (`src/app/t/layout.tsx` or `(main)/layout.tsx`), pass
 * the brand + CTA props, and every child page inherits it. Individual pages
 * must NOT render a navbar themselves — see the SEO generator prompt which
 * now forbids page-level navbar imports.
 *
 * Background/border adapt automatically: white/zinc-200 in light mode,
 * zinc-950/white-10 in dark mode. Override via `className` if you want a
 * different shade.
 *
 * @example
 * // assrt-website/src/app/t/layout.tsx
 * <SiteNavbar
 *   brandName="Assrt"
 *   brandLogo={<Logo size="md" />}
 *   ctaLabel="Get Started Free"
 *   ctaHref="https://app.assrt.ai"
 *   ctaClassName="bg-emerald-500 hover:bg-emerald-600 text-white"
 *   site="assrt"
 * />
 */
export function SiteNavbar({
  brandName,
  brandLogo,
  homeHref = "/",
  ctaLabel,
  ctaHref,
  ctaClassName = "bg-accent text-accent-contrast hover:bg-accent-dim",
  className = "",
  site,
  ctaKind = "auto",
}: SiteNavbarProps) {
  const isBooking =
    ctaKind === "schedule" ||
    (ctaKind === "auto" && isBookingUrl(ctaHref));
  const [href, setHref] = useState(ctaHref);
  useEffect(() => {
    setHref(isBooking ? withBookingAttribution(ctaHref) : ctaHref);
  }, [ctaHref, isBooking]);

  const onClick = () => {
    captureFromWindow("cta_click", {
      page: typeof window !== "undefined" ? window.location.pathname : "",
      text: ctaLabel,
      section: "navbar",
      site,
    });
    if (isBooking) {
      trackScheduleClick({
        destination: ctaHref,
        site,
        section: "navbar",
        text: ctaLabel,
        component: "SiteNavbar",
      });
    }
  };

  return (
    <nav
      className={
        "sticky top-0 z-50 backdrop-blur-md border-b " +
        "bg-white/80 border-zinc-200 " +
        "dark:bg-zinc-950/80 dark:border-white/10 " +
        className
      }
    >
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href={homeHref} className="flex items-center gap-2">
          {brandLogo ?? (
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {brandName}
            </span>
          )}
        </a>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className={
            "font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors " +
            ctaClassName
          }
        >
          {ctaLabel}
        </a>
      </div>
    </nav>
  );
}

"use client";

// Canonical all-in-one analytics wiring for consumer sites.
//
// Wraps three jobs that each site used to do slightly differently (and three
// of four sites got wrong):
//   1. init posthog-js in the browser with the right key/host,
//   2. set window.posthog so legacy non-React helpers can find it,
//   3. mount <SeoAnalyticsProvider> so library components use the typed
//      context path (preferred over window).
//
// Usage (consumer layout):
//
//   <FullSiteAnalytics
//     posthogKey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
//     posthogHost={process.env.NEXT_PUBLIC_POSTHOG_HOST}
//   >
//     {children}
//   </FullSiteAnalytics>
//
// If either env var is missing the component renders children as-is and
// skips init. In dev it emits one console.warn so a misconfigured site is
// visible in DevTools instead of silently dropping events.

import { useEffect, useState, type ReactNode } from "react";
import {
  SeoAnalyticsProvider,
  type PostHogLike,
} from "../lib/analytics-context";

export interface FullSiteAnalyticsProps {
  /** PostHog project API key. Typically process.env.NEXT_PUBLIC_POSTHOG_KEY. */
  posthogKey?: string;
  /** PostHog API host. Defaults to https://us.i.posthog.com. */
  posthogHost?: string;
  /** PostHog person profile strategy. Defaults to "identified_only". */
  personProfiles?: "always" | "identified_only" | "never";
  /** Capture SPA pageviews automatically. Defaults to true. */
  capturePageview?: boolean;
  /** Capture pageleave events. Defaults to true. */
  capturePageleave?: boolean;
  /** If true, skip the "missing key" dev warning. */
  quiet?: boolean;
  children: ReactNode;
}

let _warnedMissingKey = false;

function warnMissingKeyOnce() {
  if (_warnedMissingKey) return;
  if (typeof console === "undefined") return;
  _warnedMissingKey = true;
  // eslint-disable-next-line no-console
  console.warn(
    "[@m13v/seo-components] <FullSiteAnalytics> mounted without a " +
      "posthogKey — analytics events will no-op. Pass posthogKey=" +
      "process.env.NEXT_PUBLIC_POSTHOG_KEY or remove the component.",
  );
}

export function FullSiteAnalytics({
  posthogKey,
  posthogHost = "https://us.i.posthog.com",
  personProfiles = "identified_only",
  capturePageview = true,
  capturePageleave = true,
  quiet = false,
  children,
}: FullSiteAnalyticsProps) {
  const [posthog, setPosthog] = useState<PostHogLike | null>(null);

  useEffect(() => {
    if (!posthogKey) {
      if (!quiet) warnMissingKeyOnce();
      return;
    }
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const run = () => {
      import("posthog-js").then((mod) => {
        if (cancelled) return;
        const lib = mod.default;
        lib.init(posthogKey, {
          api_host: posthogHost,
          person_profiles: personProfiles,
          capture_pageview: capturePageview,
          capture_pageleave: capturePageleave,
        });
        // Legacy: some helpers still read window.posthog. Setting this
        // is what 3 of 4 consumer sites forgot, which silently broke
        // newsletter_subscribed and schedule_click events.
        (window as unknown as { posthog: typeof lib }).posthog = lib;
        setPosthog(lib as unknown as PostHogLike);
      });
    };

    // Defer init to idle to keep it off the critical path.
    if (typeof window !== "undefined" && window.requestIdleCallback) {
      idleId = window.requestIdleCallback(run, { timeout: 3000 });
    } else {
      timeoutId = setTimeout(run, 1);
    }

    return () => {
      cancelled = true;
      if (
        idleId !== undefined &&
        typeof window !== "undefined" &&
        window.cancelIdleCallback
      ) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [
    posthogKey,
    posthogHost,
    personProfiles,
    capturePageview,
    capturePageleave,
    quiet,
  ]);

  return (
    <SeoAnalyticsProvider posthog={posthog}>{children}</SeoAnalyticsProvider>
  );
}

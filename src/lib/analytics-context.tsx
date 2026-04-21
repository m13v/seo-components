"use client";

// Shared analytics capture primitive for @m13v/seo-components.
//
// Problem this solves:
//   Library components like NewsletterSignup and helpers like
//   trackScheduleClick need to fire PostHog events. They used to read
//   window.posthog directly, which silently no-ops on sites that import
//   posthog-js via ESM (the modern Next.js pattern). Three of four sites
//   were broken this way and nobody noticed because captures fail silently.
//
// The fix:
//   1. A React context carries a typed posthog instance.
//   2. useCapture() prefers the context, falls back to window.posthog,
//      and emits a one-time console.warn if neither is available so the
//      wiring bug is visible in dev tools instead of invisible in prod.
//   3. Consumer sites wrap their tree in <SeoAnalyticsProvider posthog={ph}>
//      (or use the all-in-one FullSiteAnalytics component).

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";

export interface PostHogLike {
  capture: (event: string, properties?: Record<string, unknown>) => void;
}

const SeoAnalyticsContext = createContext<PostHogLike | null>(null);

export interface SeoAnalyticsProviderProps {
  posthog: PostHogLike | null | undefined;
  children: ReactNode;
}

/**
 * Provide a posthog-like instance to all @m13v/seo-components descendants.
 * Pass the posthog-js default export (already init'd) or any object with a
 * `.capture(event, props)` method. If you pass null/undefined the provider
 * still mounts — descendants will fall back to window.posthog.
 */
export function SeoAnalyticsProvider({ posthog, children }: SeoAnalyticsProviderProps) {
  const value = useMemo(() => posthog ?? null, [posthog]);

  // Mirror the instance onto window.posthog so non-React helpers
  // (trackScheduleClick, legacy inline scripts) resolve without each
  // consumer site remembering to hand-wire this line after posthog.init().
  useEffect(() => {
    if (!value) return;
    if (typeof window === "undefined") return;
    const w = window as unknown as { posthog?: PostHogLike };
    if (w.posthog === value) return;
    w.posthog = value;
  }, [value]);

  return (
    <SeoAnalyticsContext.Provider value={value}>
      {children}
    </SeoAnalyticsContext.Provider>
  );
}

// One-time warning guard so a misconfigured site produces exactly one
// console.warn per page load, not one per event.
let _warnedMissingPosthog = false;

function warnMissingOnce() {
  if (_warnedMissingPosthog) return;
  if (typeof console === "undefined") return;
  _warnedMissingPosthog = true;
  // eslint-disable-next-line no-console
  console.warn(
    "[@m13v/seo-components] PostHog is not wired up — analytics events " +
      "(newsletter_subscribed, schedule_click, etc.) will silently no-op. " +
      "Either wrap your tree in <SeoAnalyticsProvider posthog={posthog}> " +
      "or set window.posthog = posthog after init. " +
      "See https://github.com/m13v/seo-components#posthog-setup",
  );
}

function readWindowPosthog(): PostHogLike | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { posthog?: PostHogLike };
  return w.posthog;
}

/**
 * Return a stable `capture(event, props)` function. Prefers the PostHog
 * instance from <SeoAnalyticsProvider>; falls back to window.posthog;
 * warns once if neither is available. Safe on the server (returns a no-op).
 */
export function useCapture(): PostHogLike["capture"] {
  const fromContext = useContext(SeoAnalyticsContext);
  return useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      const instance = fromContext ?? readWindowPosthog();
      if (!instance) {
        warnMissingOnce();
        return;
      }
      instance.capture(event, properties);
    },
    [fromContext],
  );
}

/**
 * Non-hook variant for plain-function helpers like `trackScheduleClick`.
 * Same resolution: context is not available outside React, so this only
 * consults window.posthog (and warns if missing).
 */
export function captureFromWindow(event: string, properties?: Record<string, unknown>): void {
  const instance = readWindowPosthog();
  if (!instance) {
    warnMissingOnce();
    return;
  }
  instance.capture(event, properties);
}

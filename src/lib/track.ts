// Canonical analytics helpers. Use these instead of calling
// `posthog.capture("cta_click", ...)` directly so every consumer site
// fires the same event names with the same property shape.
//
// All helpers are no-ops on the server and when PostHog is not loaded,
// but when PostHog is missing in the browser they emit a one-time
// console.warn (via captureFromWindow) so the wiring bug is visible.

import { captureFromWindow } from "./analytics-context";

/**
 * Rewrite a booking URL (Cal.com, Calendly, etc.) so the booking webhook can
 * attribute the booking back to the specific landing page it came from.
 *
 * We append Cal.com's documented `metadata[key]=value` query-param syntax,
 * which Cal.com mirrors into `booking.metadata.key` on the webhook payload.
 * Our webhook handler (social-autoposter-website/api/webhooks/cal/route.ts)
 * then writes `booking.metadata.utm_*` into the `cal_bookings.utm_*` columns,
 * so every booking carries the originating site + page path.
 *
 * Attribution scheme:
 *   utm_source   = current hostname (e.g. "fazm.com")
 *   utm_medium   = "schedule_click"
 *   utm_campaign = current pathname (e.g. "/t/how-to-quit-weed")
 *
 * SSR-safe: returns the URL unchanged on the server (no `window`) or when the
 * input cannot be parsed as a URL. Never overwrites a pre-existing metadata
 * key so manual overrides on specific CTAs still win.
 *
 * This is applied automatically by `BookCallCTA`, and by `InlineCta` /
 * `StickyBottomCta` when `trackAs === "schedule"`, so downstream consumers do
 * not need to call it directly.
 */
export function withBookingAttribution(destination: string): string {
  if (typeof window === "undefined") return destination;
  try {
    const url = new URL(destination, window.location.href);
    const setIfAbsent = (key: string, value: string) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    };
    setIfAbsent("metadata[utm_source]", window.location.hostname);
    setIfAbsent("metadata[utm_medium]", "schedule_click");
    setIfAbsent("metadata[utm_campaign]", window.location.pathname || "/");
    return url.toString();
  } catch {
    return destination;
  }
}

export interface ScheduleClickProps {
  /** Absolute URL the click sends the user to (e.g. https://cal.com/team/mediar/demo). */
  destination: string;
  /** Short slug identifying the site (e.g. "mediar", "fazm", "cyrano"). Optional: PostHog $host already identifies the site. */
  site?: string;
  /** Section of the page the CTA lives in (e.g. "hero", "footer", "guide-navbar"). */
  section?: string;
  /** Visible button/link text. */
  text?: string;
  /** Name of the rendering component (e.g. "CTAButton", "LeadCaptureModal"). */
  component?: string;
  /** Free-form extra properties — merged last, cannot override reserved keys above. */
  extra?: Record<string, unknown>;
}

/**
 * Fire the canonical `schedule_click` PostHog event. Use for every CTA that
 * sends the user to a booking/scheduling tool (Cal.com, Calendly, meetings.hubspot.com).
 *
 * The dashboard at social-autoposter/scripts/project_stats_json.py counts this
 * event per `$host` to produce the "Schedule Clicks" column in the Project
 * Funnel Stats table.
 */
export function trackScheduleClick(props: ScheduleClickProps): void {
  const { destination, site, section, text, component, extra } = props;
  captureFromWindow("schedule_click", {
    ...(extra || {}),
    destination,
    site,
    section,
    text,
    component,
    page: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}

export interface GetStartedClickProps {
  /** Absolute URL the click sends the user to (e.g. https://fazm.ai/download, https://app.assrt.ai, https://claude-meter.com/install). */
  destination: string;
  /** Short slug identifying the site (e.g. "fazm", "assrt", "claude-meter"). Optional: PostHog $host already identifies the site. */
  site?: string;
  /** Section of the page the CTA lives in (e.g. "hero", "footer", "install-modal", "signup-card"). */
  section?: string;
  /** Visible button/link text. */
  text?: string;
  /** Name of the rendering component (e.g. "GetStartedCTA", "InstallButton", "SignUpButton"). */
  component?: string;
  /** Free-form extra properties — merged last, cannot override reserved keys above. */
  extra?: Record<string, unknown>;
}

/**
 * Fire the canonical `get_started_click` PostHog event. Use for every primary
 * self-serve CTA — downloads (App Store, .dmg, /download), installs (/install,
 * Chrome Web Store), and signups (app.x.com, signup pages, waitlists, trial
 * starts). Book-a-call CTAs are tracked separately via `trackScheduleClick`.
 *
 * The dashboard at social-autoposter/scripts/project_stats_json.py counts this
 * event per `$host` to produce the "Get Started" column in the Project Funnel
 * Stats table.
 */
export function trackGetStartedClick(props: GetStartedClickProps): void {
  const { destination, site, section, text, component, extra } = props;
  captureFromWindow("get_started_click", {
    ...(extra || {}),
    destination,
    site,
    section,
    text,
    component,
    page: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}

/**
 * @deprecated Use `trackGetStartedClick` instead. This alias emits
 * `get_started_click` (not `download_click`) so the canonical event name is
 * what reaches PostHog; only the import name is kept for backward compat.
 */
export type DownloadClickProps = GetStartedClickProps;

/**
 * @deprecated Use `trackGetStartedClick` instead. Kept as a thin alias so
 * existing callers keep compiling; the emitted event is `get_started_click`,
 * not `download_click`.
 */
export function trackDownloadClick(props: GetStartedClickProps): void {
  trackGetStartedClick(props);
}

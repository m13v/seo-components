// Canonical analytics helpers. Use these instead of calling
// `posthog.capture("cta_click", ...)` directly so every consumer site
// fires the same event names with the same property shape.
//
// All helpers are no-ops on the server and when PostHog is not loaded,
// but when PostHog is missing in the browser they emit a one-time
// console.warn (via captureFromWindow) so the wiring bug is visible.

import { captureFromWindow } from "./analytics-context";

// Rage-click dedup window. A real visitor revisiting the page later still
// records; only same-event+same-destination+same-page firings within this
// window collapse to one. 2026-05-03: claude-meter.com had 11 reported
// `get_started_click` events in 24h that were actually 2 unique users
// rage-mashing the install button (5-6 clicks within 4-14s each). Dedup
// at the helper layer catches every callsite (GetStartedCTA, InlineCta,
// StickyBottomCta, InstallEmailGate, ClaudeMeterCta, BookCallCTA,
// SiteNavbar, and any custom caller in consumer sites).
const _DEDUP_WINDOW_MS = 1500;
const _lastFire = new Map<string, number>();

function _shouldSuppressRecent(key: string, windowMs = _DEDUP_WINDOW_MS): boolean {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const last = _lastFire.get(key);
  if (last != null && now - last < windowMs) return true;
  _lastFire.set(key, now);
  // Keep the map from growing unbounded on long-lived SPAs.
  if (_lastFire.size > 256) {
    const cutoff = now - 60_000;
    for (const [k, t] of _lastFire) {
      if (t < cutoff) _lastFire.delete(k);
    }
  }
  return false;
}

function _dedupKey(event: string, destination: string | undefined): string {
  const page = typeof window !== "undefined" ? window.location.pathname : "";
  return event + "::" + (destination || "") + "::" + page;
}

/**
 * Rewrite a booking URL (Cal.com, Calendly, etc.) so the booking webhook can
 * attribute the booking back to the specific landing page it came from.
 *
 * Cal.com's hosted booking page captures plain `utm_source/utm_medium/utm_campaign`
 * URL query params and stores them on the booking's metadata, which Cal.com
 * then forwards in the webhook payload as `booking.metadata.utm_*`. We also
 * emit Cal.com's bracketed `metadata[key]=value` form as a belt-and-braces
 * fallback (some Cal.com surfaces accept that syntax instead). Our webhook
 * handler (social-autoposter-website/api/webhooks/cal/route.ts) writes
 * `booking.metadata.utm_*` into `cal_bookings.utm_source / utm_medium /
 * utm_campaign`, so every booking carries the originating site + page path.
 *
 * Attribution scheme:
 *   utm_source   = current hostname (e.g. "fazm.com")
 *   utm_medium   = "schedule_click"
 *   utm_campaign = current pathname (e.g. "/t/how-to-quit-weed")
 *
 * SSR-safe: returns the URL unchanged on the server (no `window`) or when the
 * input cannot be parsed as a URL. Never overwrites a pre-existing query key
 * so manual overrides on specific CTAs still win.
 *
 * Applied automatically by `BookCallCTA`, and by `InlineCta` /
 * `StickyBottomCta` when `trackAs === "schedule"`. Consumers that build a
 * custom Book-a-Call CTA MUST route their href through this helper or
 * page-level booking attribution breaks.
 */
export function withBookingAttribution(destination: string): string {
  if (typeof window === "undefined") return destination;
  try {
    const url = new URL(destination, window.location.href);
    const source = window.location.hostname;
    const campaign = window.location.pathname || "/";
    const setIfAbsent = (key: string, value: string) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    };
    setIfAbsent("utm_source", source);
    setIfAbsent("utm_medium", "schedule_click");
    setIfAbsent("utm_campaign", campaign);
    setIfAbsent("metadata[utm_source]", source);
    setIfAbsent("metadata[utm_medium]", "schedule_click");
    setIfAbsent("metadata[utm_campaign]", campaign);
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
  if (_shouldSuppressRecent(_dedupKey("schedule_click", destination))) return;
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
  if (_shouldSuppressRecent(_dedupKey("get_started_click", destination))) return;
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

export interface CrossProductClickProps {
  /** Absolute URL the click sends the user to (e.g. https://claude-meter.com/install). */
  destination: string;
  /** Slug of the ORIGIN site the click happened on (e.g. "fazm"). */
  site?: string;
  /** Slug of the DESTINATION product being promoted (e.g. "claude-meter"). */
  targetProduct?: string;
  /** Section of the page the CTA lives in (e.g. "blog-post-top", "blog-post-bottom"). */
  section?: string;
  /** Visible button/link text. */
  text?: string;
  /** Name of the rendering component (e.g. "ClaudeMeterCta"). */
  component?: string;
  /** Free-form extra properties — merged last, cannot override reserved keys above. */
  extra?: Record<string, unknown>;
}

/**
 * Fire the canonical `cross_product_click` PostHog event. Use for every CTA
 * that promotes a SIBLING product on a different site (e.g. a Claude Meter
 * CTA on fazm.ai blog posts). These clicks are tracked separately from the
 * primary `get_started_click` event so the dashboard can distinguish
 * own-product conversions from cross-promotion.
 *
 * The dashboard at social-autoposter/scripts/project_stats_json.py counts
 * this event per `$host` to produce the "Cross Product" column in the
 * Project Funnel Stats table.
 */
export function trackCrossProductClick(props: CrossProductClickProps): void {
  const { destination, site, targetProduct, section, text, component, extra } = props;
  if (_shouldSuppressRecent(_dedupKey("cross_product_click", destination))) return;
  captureFromWindow("cross_product_click", {
    ...(extra || {}),
    destination,
    site,
    target_product: targetProduct,
    section,
    text,
    component,
    page: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}

/**
 * Identify the current browser session with a book-call lead's email so
 * PostHog stitches the pre-booking browser activity, the welcome-email
 * click (`book_call_email_link_clicked`), and the completed Cal booking
 * (`cal_booking_completed`) into one person.
 *
 * We use the raw email as `distinct_id` to match the server-side identity
 * used in the email-click redirect handler. If posthog-js isn't loaded
 * yet, this is a no-op — the subsequent browser capture() calls will
 * still fire with the anonymous id and PostHog will merge on identify
 * later.
 */
export function identifyBookCallLead(email: string): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    posthog?: {
      identify?: (id: string, props?: Record<string, unknown>) => void;
    };
  };
  const id = (email || "").trim().toLowerCase();
  if (!id || !id.includes("@")) return;
  try {
    w.posthog?.identify?.(id, { email: id });
  } catch {
    /* no-op */
  }
}

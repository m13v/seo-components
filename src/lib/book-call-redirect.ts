import { NextRequest } from "next/server";

export interface BookCallRedirectConfig {
  /** Site slug. Must match the value the POST handler encoded into the link. */
  site: string;
  /** Fallback booking URL (Cal.com or Calendly). Email prefill is appended. */
  fallbackBookingUrl: string;
  /** Env var for the PostHog project key (default: "NEXT_PUBLIC_POSTHOG_KEY"). */
  posthogKeyEnv?: string;
  /** Env var for the PostHog host (default: "NEXT_PUBLIC_POSTHOG_HOST"). */
  posthogHostEnv?: string;
}

/**
 * Factory for `GET /go/book?email=<email>&site=<slug>`.
 *
 * The handler:
 *   1. Reads `email` and `site` from the query string (unsigned — the blast
 *      radius of forgery is a noisy PostHog event).
 *   2. Fires a server-side `book_call_email_link_clicked` PostHog event with
 *      `distinct_id = email`. Unique-user dedup is handled by PostHog.
 *   3. 302s to Cal.com / Calendly with `?email=` pre-filled and
 *      `utm_medium=email_booking_link` so the funnel column separates
 *      email-origin clicks from on-site schedule_clicks.
 */
export function createBookCallRedirectHandler(config: BookCallRedirectConfig) {
  const {
    site,
    fallbackBookingUrl,
    posthogKeyEnv = "NEXT_PUBLIC_POSTHOG_KEY",
    posthogHostEnv = "NEXT_PUBLIC_POSTHOG_HOST",
  } = config;

  return async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const rawEmail = url.searchParams.get("email") || "";
    const querySite = url.searchParams.get("site") || "";

    const email = rawEmail.trim().toLowerCase();
    const validEmail = !!email && email.includes("@") && email.length <= 254;
    const siteMatches = querySite === site;

    // If the query is malformed or targeted at a different site, drop to the
    // bare booking URL so the user still reaches Cal/Calendly.
    if (validEmail && siteMatches) {
      const posthogKey = process.env[posthogKeyEnv];
      if (posthogKey) {
        try {
          // Lazy import so sites that never use this handler don't have to
          // install posthog-node to satisfy Next.js static analysis.
          const { PostHog } = await import("posthog-node");
          const ph = new PostHog(posthogKey, {
            host: process.env[posthogHostEnv] || "https://us.i.posthog.com",
            flushAt: 1,
            flushInterval: 0,
          });
          ph.capture({
            distinctId: email,
            event: "book_call_email_link_clicked",
            properties: {
              site,
              email,
              $set: { email },
            },
          });
          await ph.shutdown();
        } catch (err) {
          console.error("[book-call/redirect] posthog capture failed:", err);
        }
      }
    }

    // Build final Cal/Calendly URL with email + utm.
    let destination = fallbackBookingUrl;
    try {
      const dest = new URL(fallbackBookingUrl);
      if (validEmail && !dest.searchParams.has("email")) {
        dest.searchParams.set("email", email);
      }
      if (!dest.searchParams.has("utm_source")) dest.searchParams.set("utm_source", site);
      dest.searchParams.set("utm_medium", "email_booking_link");
      if (!dest.searchParams.has("utm_campaign")) dest.searchParams.set("utm_campaign", "book_call_email");
      // Cal.com also accepts the bracketed metadata form; harmless on Calendly.
      if (!dest.searchParams.has("metadata[utm_source]")) dest.searchParams.set("metadata[utm_source]", site);
      dest.searchParams.set("metadata[utm_medium]", "email_booking_link");
      if (!dest.searchParams.has("metadata[utm_campaign]")) dest.searchParams.set("metadata[utm_campaign]", "book_call_email");
      destination = dest.toString();
    } catch {
      // fall through to bare fallbackBookingUrl
    }

    return Response.redirect(destination, 302);
  };
}

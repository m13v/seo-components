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
 *   2. Fires a `book_call_email_link_clicked` event to PostHog via the
 *      public `/i/v0/e/` HTTP endpoint (no posthog-node dependency), with
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

    if (validEmail && siteMatches) {
      const posthogKey = process.env[posthogKeyEnv];
      const posthogHost = process.env[posthogHostEnv] || "https://us.i.posthog.com";
      if (posthogKey) {
        // Fire via PostHog's public HTTP capture endpoint. Fire-and-forget
        // with .catch so a PostHog hiccup never delays the 302.
        fetch(`${posthogHost.replace(/\/+$/, "")}/i/v0/e/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: posthogKey,
            event: "book_call_email_link_clicked",
            distinct_id: email,
            timestamp: new Date().toISOString(),
            properties: {
              site,
              email,
              $set: { email },
            },
          }),
        }).catch((err) => {
          console.error("[book-call/redirect] posthog fetch failed:", err);
        });
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

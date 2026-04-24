import { NextRequest } from "next/server";
import { PostHog } from "posthog-node";
import { verifyBookCallToken } from "./book-call-token";

export interface BookCallRedirectConfig {
  /** Site slug, must match the config used by createBookCallHandler. */
  site: string;
  /** Fallback booking URL if the token is missing, expired, or tampered with. */
  fallbackBookingUrl: string;
  /** Env var for the HMAC secret (default: "BOOK_CALL_TOKEN_SECRET"). */
  tokenSecretEnv?: string;
  /** Env var for the Neon / Postgres URL (default: "BOOKINGS_DATABASE_URL"). */
  databaseUrlEnv?: string;
  /** Env var for the PostHog project key (default: "NEXT_PUBLIC_POSTHOG_KEY"). */
  posthogKeyEnv?: string;
  /** Env var for the PostHog host (default: "NEXT_PUBLIC_POSTHOG_HOST"). */
  posthogHostEnv?: string;
  /** Token max age in ms (default: 60 days). */
  maxAgeMs?: number;
}

/**
 * Factory for `GET /go/book?t=<signed-token>`.
 *
 * The handler:
 *   1. Verifies the HMAC-signed token and extracts `{email, site, issued_at}`.
 *   2. Looks up the lead in `book_call_leads` and, if `email_link_clicked_at`
 *      is NULL, sets it to NOW() AND fires a server-side
 *      `book_call_email_link_clicked` PostHog event with `distinct_id = email`.
 *      (Subsequent clicks still redirect but don't fire duplicate events —
 *      this is how we "not duplicated across unique users".)
 *   3. Rewrites the redirect URL so Cal.com / Calendly has the email
 *      pre-filled (`?email=...`) and tags `utm_medium=email_booking_link`
 *      so the funnel column separates email-origin clicks from on-site
 *      schedule_clicks.
 */
export function createBookCallRedirectHandler(config: BookCallRedirectConfig) {
  const {
    site,
    fallbackBookingUrl,
    tokenSecretEnv = "BOOK_CALL_TOKEN_SECRET",
    databaseUrlEnv = "BOOKINGS_DATABASE_URL",
    posthogKeyEnv = "NEXT_PUBLIC_POSTHOG_KEY",
    posthogHostEnv = "NEXT_PUBLIC_POSTHOG_HOST",
    maxAgeMs,
  } = config;

  return async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const token = url.searchParams.get("t") || "";
    const tokenSecret = process.env[tokenSecretEnv];

    // If token can't be verified, redirect to the bare fallback booking URL.
    // We still return a 302 (no 4xx) so the user keeps moving.
    if (!token || !tokenSecret) {
      return Response.redirect(fallbackBookingUrl, 302);
    }

    const payload = verifyBookCallToken(token, tokenSecret, maxAgeMs);
    if (!payload || payload.s !== site) {
      return Response.redirect(fallbackBookingUrl, 302);
    }

    const email = payload.e;
    let shouldFire = false;

    const databaseUrl = process.env[databaseUrlEnv];
    if (databaseUrl) {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(databaseUrl);
        const rows = (await sql`
          UPDATE book_call_leads
          SET email_link_clicked_at = NOW()
          WHERE email = ${email}
            AND site = ${site}
            AND email_link_clicked_at IS NULL
          RETURNING id
        `) as Array<{ id: number }>;
        shouldFire = rows.length > 0;
      } catch (err) {
        console.error("[book-call/redirect] DB update failed:", err);
      }
    }

    // Fire the server-side event once per unique (email, site).
    if (shouldFire) {
      const posthogKey = process.env[posthogKeyEnv];
      if (posthogKey) {
        const ph = new PostHog(posthogKey, {
          host: process.env[posthogHostEnv] || "https://us.i.posthog.com",
          flushAt: 1,
          flushInterval: 0,
        });
        try {
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

    // Build the final Cal/Calendly URL with email prefill + utm.
    let destination = fallbackBookingUrl;
    try {
      const dest = new URL(fallbackBookingUrl);
      if (!dest.searchParams.has("email")) dest.searchParams.set("email", email);
      if (!dest.searchParams.has("utm_source")) dest.searchParams.set("utm_source", site);
      dest.searchParams.set("utm_medium", "email_booking_link");
      if (!dest.searchParams.has("utm_campaign")) dest.searchParams.set("utm_campaign", "book_call_email");
      // Cal.com's bracketed metadata form as a belt-and-braces for its webhook.
      if (!dest.searchParams.has("metadata[utm_source]")) dest.searchParams.set("metadata[utm_source]", site);
      dest.searchParams.set("metadata[utm_medium]", "email_booking_link");
      if (!dest.searchParams.has("metadata[utm_campaign]")) dest.searchParams.set("metadata[utm_campaign]", "book_call_email");
      destination = dest.toString();
    } catch {
      // fall through to raw fallbackBookingUrl
    }

    return Response.redirect(destination, 302);
  };
}

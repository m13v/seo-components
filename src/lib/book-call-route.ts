import { NextRequest } from "next/server";
import { signBookCallToken } from "./book-call-token";

/* ------------------------------------------------------------------ */
/*  Default welcome + book-call email template                         */
/* ------------------------------------------------------------------ */

function defaultBookCallEmailHtml(
  brand: string,
  siteUrl: string,
  emailBookingUrl: string,
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#06b6d4,#14b8a6);"></td>
          </tr>
          <tr>
            <td style="padding:32px 32px 0;">
              <span style="font-size:22px;font-weight:bold;color:#0f172a;">${brand}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 12px;">
              <h1 style="margin:0;font-size:24px;font-weight:bold;color:#0f172a;line-height:1.3;">
                Pick a time that works
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;color:#475569;font-size:15px;line-height:1.6;">
              Thanks for reaching out. Use the link below to grab a 20-minute slot, and we'll walk you through ${brand} live.
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 12px;">
              <a href="${emailBookingUrl}" style="display:inline-block;padding:12px 24px;background-color:#14b8a6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                Book your call
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;color:#64748b;font-size:14px;line-height:1.6;">
              Or reply to this email if you'd rather chat async first.
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e2e8f0;padding:20px 32px;color:#94a3b8;font-size:13px;line-height:1.5;">
              You're receiving this because you asked to talk to us at <a href="${siteUrl}" style="color:#14b8a6;text-decoration:none;">${brand}</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Config & types                                                     */
/* ------------------------------------------------------------------ */

export interface BookCallConfig {
  /** Site slug (matches the audience / posthog $host). Stored in book_call_leads.site. */
  site: string;
  /** Resend audience ID (SAME id as the site's newsletter audience — one audience per client). */
  audienceId: string;
  /** "From" header for the booking email (e.g. "Matt from Fazm <matt@fazm.ai>"). */
  fromEmail: string;
  /** Brand name used in the default email template. */
  brand: string;
  /** Canonical site URL (used in the default email footer). */
  siteUrl: string;
  /**
   * Absolute URL for the email-click redirect endpoint, e.g. "https://fazm.ai/go/book".
   * The factory appends `?t=<signed-token>` to this base.
   */
  redirectBaseUrl: string;
  /** Env var for the Resend API key (default: "RESEND_API_KEY"). */
  apiKeyEnv?: string;
  /** Env var for the Neon / Postgres URL (default: "BOOKINGS_DATABASE_URL"). */
  databaseUrlEnv?: string;
  /** Env var for the HMAC secret used to sign the email-click token (default: "BOOK_CALL_TOKEN_SECRET"). */
  tokenSecretEnv?: string;
  /** Override the email subject line. */
  emailSubject?: string;
  /** Override the email HTML. Receives the email-click URL (with signed token) and the submitted email. */
  emailHtml?: (emailClickUrl: string, subscriberEmail: string) => string;
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

/**
 * Factory for `POST /api/book-call`.
 *
 * The handler:
 *   1. Upserts the email into the client's Resend audience (same audience as
 *      NewsletterSignup — one shared audience per client).
 *   2. Upserts a row into the shared `book_call_leads` table (Neon), so we
 *      can tell if this is a first-time lead (drives dedup of the
 *      `newsletter_subscribed` PostHog event).
 *   3. Fires a welcome email with a booking link routed through the site's
 *      `/go/book?t=<signed-token>` redirect endpoint. The token is an
 *      HMAC-signed short-lived payload carrying `{email, site, issued_at}`.
 *
 * The response is deliberately small: the client uses `first_seen` to decide
 * whether to fire the `newsletter_subscribed` event, and redirects the user
 * to the booking URL itself (with `?email=` prefilled) so we avoid an extra
 * server round-trip before Cal.com / Calendly opens.
 */
export function createBookCallHandler(config: BookCallConfig) {
  const {
    site,
    audienceId,
    fromEmail,
    brand,
    siteUrl,
    redirectBaseUrl,
    apiKeyEnv = "RESEND_API_KEY",
    databaseUrlEnv = "BOOKINGS_DATABASE_URL",
    tokenSecretEnv = "BOOK_CALL_TOKEN_SECRET",
    emailSubject,
    emailHtml,
  } = config;

  return async function POST(req: NextRequest) {
    const resendKey = process.env[apiKeyEnv];
    const databaseUrl = process.env[databaseUrlEnv];
    const tokenSecret = process.env[tokenSecretEnv];
    if (!resendKey || !databaseUrl || !tokenSecret) {
      console.error("[book-call] missing env:", {
        resendKey: !!resendKey,
        databaseUrl: !!databaseUrl,
        tokenSecret: !!tokenSecret,
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    let body: {
      email?: string;
      destination?: string;
      source_path?: string;
      source_host?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@") || email.length > 254) {
      return new Response(
        JSON.stringify({ error: "A valid email address is required" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const destination = typeof body.destination === "string" ? body.destination : null;
    const sourcePath = typeof body.source_path === "string" ? body.source_path : null;
    const sourceHost = typeof body.source_host === "string" ? body.source_host : null;
    const utmSource = typeof body.utm_source === "string" ? body.utm_source : null;
    const utmMedium = typeof body.utm_medium === "string" ? body.utm_medium : null;
    const utmCampaign = typeof body.utm_campaign === "string" ? body.utm_campaign : null;

    // 1. DB upsert: returns first_seen=true on a fresh insert.
    //    Using a dynamic import so the handler doesn't force Neon onto
    //    consumers that might ever want a different driver.
    let firstSeen = true;
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(databaseUrl);
      const rows = (await sql`
        INSERT INTO book_call_leads (
          email, site, source_path, source_host, destination,
          utm_source, utm_medium, utm_campaign
        ) VALUES (
          ${email}, ${site}, ${sourcePath}, ${sourceHost}, ${destination},
          ${utmSource}, ${utmMedium}, ${utmCampaign}
        )
        ON CONFLICT (email, site) DO UPDATE SET
          last_intent_at = NOW(),
          source_path = COALESCE(EXCLUDED.source_path, book_call_leads.source_path),
          source_host = COALESCE(EXCLUDED.source_host, book_call_leads.source_host),
          destination = COALESCE(EXCLUDED.destination, book_call_leads.destination),
          utm_source = COALESCE(EXCLUDED.utm_source, book_call_leads.utm_source),
          utm_medium = COALESCE(EXCLUDED.utm_medium, book_call_leads.utm_medium),
          utm_campaign = COALESCE(EXCLUDED.utm_campaign, book_call_leads.utm_campaign)
        RETURNING (xmax = 0) AS first_seen
      `) as Array<{ first_seen: boolean }>;
      firstSeen = rows[0]?.first_seen ?? true;
    } catch (err) {
      console.error("[book-call] DB upsert failed:", err);
      // Don't hard-fail the user-facing flow on DB issues — the lead is still
      // captured in Resend and the browser can still redirect to Cal.
      firstSeen = true;
    }

    // 2. Resend audience upsert (shared with NewsletterSignup — one audience per client).
    const contactRes = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      },
    );
    if (!contactRes.ok) {
      const detail = await contactRes.text().catch(() => "");
      console.error("[book-call] Failed to add contact:", detail);
    }

    // 3. Signed token + email (fire-and-forget, doesn't block the redirect).
    const token = signBookCallToken(email, site, tokenSecret);
    const emailClickUrl = `${redirectBaseUrl}?t=${encodeURIComponent(token)}`;
    const subject = emailSubject || `Book a 20-minute call with ${brand}`;
    const html = emailHtml
      ? emailHtml(emailClickUrl, email)
      : defaultBookCallEmailHtml(brand, siteUrl, emailClickUrl);

    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromEmail, to: email, subject, html }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          console.error("[book-call] Failed to send email:", detail);
          return;
        }
        try {
          const { neon } = await import("@neondatabase/serverless");
          const sql = neon(databaseUrl);
          await sql`
            UPDATE book_call_leads
            SET email_link_sent_at = NOW()
            WHERE email = ${email} AND site = ${site}
          `;
        } catch {
          /* best-effort timestamp */
        }
      })
      .catch((err) => console.error("[book-call] email send threw:", err));

    return new Response(
      JSON.stringify({ ok: true, first_seen: firstSeen }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
}

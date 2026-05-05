import { NextRequest } from "next/server";

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
  /** Site slug (matches PostHog $host). Included in the email-click URL. */
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
   * The factory appends `?email=<subscriber>&site=<slug>` to this base.
   */
  redirectBaseUrl: string;
  /** Env var for the Resend API key (default: "RESEND_API_KEY"). */
  apiKeyEnv?: string;
  /** Override the email subject line. */
  emailSubject?: string;
  /** Override the email HTML. Receives the email-click URL and the submitted email. */
  emailHtml?: (emailClickUrl: string, subscriberEmail: string) => string;
  /**
   * Optional: log the outbound send. Called after the Resend send call returns;
   * receives the subscriber email and the Resend email id (or null on failure).
   * Errors thrown here are logged and swallowed so a flaky DB doesn't break the
   * booking flow. Required for sites that want delivery / open / click webhook
   * events to update the right `<slug>_emails` row by `resend_id`.
   */
  onSent?: (email: string, resendEmailId: string | null) => Promise<void>;
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
 *   2. Sends a welcome email with a booking link routed through the site's
 *      `/go/book?email=...&site=...` redirect endpoint.
 *
 * Dedup is handled entirely by PostHog at the user level (`identify(email)`
 * before capture). No DB, no signed token — see createBookCallRedirectHandler
 * for the matching simplification on the redirect side.
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
    emailSubject,
    emailHtml,
    onSent,
  } = config;

  return async function POST(req: NextRequest) {
    const resendKey = process.env[apiKeyEnv];
    if (!resendKey) {
      console.error("[book-call] missing", apiKeyEnv);
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    let body: { email?: string };
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

    // 1. Resend audience upsert (shared with NewsletterSignup — one audience per client).
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

    // 2. Welcome email with a site-scoped `/go/book` link (fire-and-forget).
    const emailClickUrl = `${redirectBaseUrl}?email=${encodeURIComponent(email)}&site=${encodeURIComponent(site)}`;
    const subject = emailSubject || `Book a 20-minute call with ${brand}`;
    const html = emailHtml
      ? emailHtml(emailClickUrl, email)
      : defaultBookCallEmailHtml(brand, siteUrl, emailClickUrl);

    if (onSent) {
      // Sequential so the `onSent` callback receives the actual Resend id.
      try {
        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from: fromEmail, to: email, subject, html }),
        });
        let resendEmailId: string | null = null;
        if (sendRes.ok) {
          const data = (await sendRes.json().catch(() => ({}))) as { id?: string };
          resendEmailId = data.id || null;
        } else {
          const detail = await sendRes.text().catch(() => "");
          console.error("[book-call] email send failed:", sendRes.status, detail);
        }
        try {
          await onSent(email, resendEmailId);
        } catch (err) {
          console.error("[book-call] onSent callback error:", err);
        }
      } catch (err) {
        console.error("[book-call] email send threw:", err);
      }
    } else {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: fromEmail, to: email, subject, html }),
      }).catch((err) => console.error("[book-call] email send threw:", err));
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
}

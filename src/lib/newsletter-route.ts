import { NextRequest } from "next/server";

/* ------------------------------------------------------------------ */
/*  Default welcome email template (light theme, teal brand)           */
/* ------------------------------------------------------------------ */

function defaultWelcomeEmailHtml(brand: string, siteUrl: string): string {
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
          <!-- Header accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#06b6d4,#14b8a6);"></td>
          </tr>
          <!-- Logo / brand -->
          <tr>
            <td style="padding:32px 32px 0;">
              <span style="font-size:22px;font-weight:bold;color:#0f172a;">${brand}</span>
            </td>
          </tr>
          <!-- Heading -->
          <tr>
            <td style="padding:24px 32px 12px;">
              <h1 style="margin:0;font-size:24px;font-weight:bold;color:#0f172a;line-height:1.3;">
                Welcome to the newsletter
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 32px 24px;color:#475569;font-size:15px;line-height:1.6;">
              Thanks for subscribing! You'll receive our latest guides, tips, and updates straight to your inbox.
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td style="padding:0 32px 32px;">
              <a href="${siteUrl}" style="display:inline-block;padding:12px 24px;background-color:#14b8a6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                Visit ${brand}
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e2e8f0;padding:20px 32px;color:#94a3b8;font-size:13px;line-height:1.5;">
              You're receiving this because you signed up at <a href="${siteUrl}" style="color:#14b8a6;text-decoration:none;">${brand}</a>.
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

export interface NewsletterConfig {
  /** Resend audience ID (required). Contacts are added to this audience. */
  audienceId: string;
  /** "From" header for the welcome email (e.g. "Matt from Fazm <matt@fazm.ai>") */
  fromEmail: string;
  /** Brand name used in the default email template */
  brand: string;
  /** Site URL used in the default email template CTA link */
  siteUrl: string;
  /** Env var name for the Resend API key (default: "RESEND_API_KEY") */
  apiKeyEnv?: string;
  /** Override the welcome email subject line */
  welcomeSubject?: string;
  /**
   * Override the welcome email HTML body.
   * Receives the subscriber email and should return an HTML string.
   */
  welcomeHtml?: (email: string) => string;
  /**
   * Optional: log the signup to a database.
   * Called after the email is sent successfully.
   * Receives the subscriber email and the Resend email ID.
   */
  onSignup?: (email: string, resendEmailId: string | null) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

export function createNewsletterHandler(config: NewsletterConfig) {
  const {
    audienceId,
    fromEmail,
    brand,
    siteUrl,
    apiKeyEnv = "RESEND_API_KEY",
    welcomeSubject,
    welcomeHtml,
    onSignup,
  } = config;

  return async function POST(req: NextRequest) {
    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
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
    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "A valid email address is required" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    // 1. Add contact to Resend audience (upsert; Resend deduplicates by email)
    const contactRes = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      },
    );

    if (!contactRes.ok) {
      const detail = await contactRes.text().catch(() => "");
      console.error("[newsletter] Failed to add contact:", detail);
      return new Response(
        JSON.stringify({ error: "Failed to subscribe. Please try again." }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }

    // Check if this is a new contact or an existing one re-subscribing.
    // Resend returns { id, object: "contact" } for new contacts.
    // If the contact already existed, we still send the welcome email
    // (Resend audience upserts are idempotent).

    // 2. Send welcome email
    const subject = welcomeSubject || `Welcome to ${brand}`;
    const html = welcomeHtml
      ? welcomeHtml(email)
      : defaultWelcomeEmailHtml(brand, siteUrl);

    let resendEmailId: string | null = null;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject,
        html,
      }),
    });

    if (emailRes.ok) {
      const data = await emailRes.json().catch(() => ({}));
      resendEmailId = data.id || null;
    } else {
      // Log but don't fail; the contact was added to the audience already.
      const detail = await emailRes.text().catch(() => "");
      console.error("[newsletter] Failed to send welcome email:", detail);
    }

    // 3. Optional DB logging callback
    if (onSignup) {
      try {
        await onSignup(email, resendEmailId);
      } catch (err) {
        console.error("[newsletter] onSignup callback error:", err);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
}

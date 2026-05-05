import { NextRequest } from "next/server";

/* ------------------------------------------------------------------ */
/*  Resend Inbound webhook handler                                     */
/* ------------------------------------------------------------------ */
/*                                                                     */
/*  Handles BOTH inbound (`email.received`) and outbound delivery     */
/*  events (sent / delivered / opened / clicked / bounced /           */
/*  complained / delayed) on the same /api/webhooks/resend endpoint.  */
/*                                                                     */
/*  Pattern: every client site sends from `<sender>@<domain>` (a real  */
/*  human-named address). Recipients hit Reply. Without this handler,  */
/*  those replies bounce silently and the site is deaf to its own      */
/*  customers. Pair this with apex `MX 10 inbound-smtp.us-east-1.      */
/*  amazonaws.com.` and a registered Resend webhook for                */
/*  `email.received` plus the delivery events.                         */
/*                                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_IGNORED_SENDERS: RegExp[] = [
  /dmarc/i,
  /^noreply@/i,
  /^no-reply@/i,
  /^system@/i,
  /^mailer-daemon@/i,
  /^postmaster@/i,
  /@saashub\.com$/i,
  /^invoice.*@stripe\.com$/i,
  /@email\.figma\.com$/i,
  /@.*\.postmarkapp\.com$/i,
];

const DEFAULT_IGNORED_SUBJECTS = /\bDMARC\b|Report Domain:|aggregate report/i;

const DELIVERY_STATUS_MAP: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delayed",
};

export interface ResendInboundPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    text?: string;
    html?: string;
  };
}

export interface ResendInboundConfig {
  /**
   * Domain the webhook is bound to (e.g. "studyly.io"). Used to filter inbound
   * events: any `to` address not ending in `@<domain>` is ignored. Required.
   */
  domain: string;
  /**
   * Where to forward inbound mail so a human actually sees it
   * (e.g. "i@m13v.com"). Required, no default.
   */
  forwardTo: string;
  /**
   * "From" header used when forwarding to {@link forwardTo}
   * (e.g. "Studyly Inbound <matt@studyly.io>"). Required.
   */
  forwardFrom: string;
  /**
   * Brand label used in the "[<Brand> Inbound] <subject>" prefix on forwarded
   * mail. Required.
   */
  brand: string;
  /** Env var name for the Resend API key (default: "RESEND_API_KEY") */
  apiKeyEnv?: string;
  /**
   * Optional: persist inbound to your DB. Called BEFORE the forward fires;
   * a thrown error is logged and swallowed.
   */
  onInbound?: (record: {
    resendId: string;
    fromEmail: string;
    toEmail: string;
    fromRaw: string;
    toRaw: string[];
    subject: string;
    bodyText: string | null;
    bodyHtml: string | null;
  }) => Promise<void>;
  /**
   * Optional: handle outbound delivery events (delivered/opened/clicked/etc).
   * Receives the event type, resend email id, and ISO timestamp. Errors are
   * logged and swallowed so a flaky DB doesn't break the webhook.
   */
  onDeliveryEvent?: (event: {
    type: string;
    status: string;
    resendId: string;
    timestamp: string;
  }) => Promise<void>;
  /**
   * Skip forwarding (only persist + return 200). Useful for tests, or for
   * sites where the DB log is the only consumer.
   */
  skipForward?: boolean;
  /**
   * Override the automated-sender deny list. Defaults cover DMARC reports,
   * mailer-daemon, Stripe invoice noise, etc.
   */
  ignoredSenders?: RegExp[];
  /** Override the automated-subject deny pattern. */
  ignoredSubjects?: RegExp;
}

function parseEmail(raw: string): string {
  const m = raw.match(/<([^>]+)>/) || raw.match(/^([^\s<]+@[^\s>]+)$/);
  return m ? m[1].toLowerCase() : raw.toLowerCase();
}

async function fetchInboundContent(emailId: string, apiKey: string) {
  try {
    const res = await fetch(
      `https://api.resend.com/emails/receiving/${emailId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string; html?: string };
    return { text: data?.text, html: data?.html };
  } catch {
    return null;
  }
}

export function createResendInboundHandler(config: ResendInboundConfig) {
  const {
    domain,
    forwardTo,
    forwardFrom,
    brand,
    apiKeyEnv = "RESEND_API_KEY",
    onInbound,
    onDeliveryEvent,
    skipForward = false,
    ignoredSenders = DEFAULT_IGNORED_SENDERS,
    ignoredSubjects = DEFAULT_IGNORED_SUBJECTS,
  } = config;

  const domainSuffix = `@${domain.toLowerCase()}`;
  const tag = `[${brand} Webhook]`;

  async function handleInbound(payload: ResendInboundPayload, apiKey: string) {
    const { data } = payload;
    const isForUs = data.to.some((addr) =>
      addr.toLowerCase().endsWith(domainSuffix),
    );
    if (!isForUs) {
      console.log(`${tag} ignoring, not addressed to ${domainSuffix}:`, data.to);
      return;
    }

    const fromEmail = parseEmail(data.from);
    const automated =
      ignoredSenders.some((p) => p.test(fromEmail)) ||
      (data.subject && ignoredSubjects.test(data.subject));
    if (automated) {
      console.log(
        `${tag} ignoring automated email from`,
        fromEmail,
        "subject:",
        data.subject,
      );
      return;
    }

    const content = await fetchInboundContent(data.email_id, apiKey);
    const bodyText = content?.text || data.text || null;
    const bodyHtml = content?.html || data.html || null;
    const toEmail = data.to[0] || "";

    if (onInbound) {
      try {
        await onInbound({
          resendId: data.email_id,
          fromEmail,
          toEmail,
          fromRaw: data.from,
          toRaw: data.to,
          subject: data.subject || "",
          bodyText,
          bodyHtml,
        });
      } catch (err) {
        console.error(`${tag} onInbound error`, err);
      }
    }

    if (skipForward) return;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: forwardFrom,
          to: forwardTo,
          subject: `[${brand} Inbound] ${data.subject || "(no subject)"}`,
          text: `From: ${data.from}\nTo: ${data.to.join(", ")}\n\n${bodyText || "(no body)"}`,
        }),
      });
    } catch (err) {
      console.error(`${tag} forward send error`, err);
    }
  }

  async function handleDelivery(payload: ResendInboundPayload) {
    const status = DELIVERY_STATUS_MAP[payload.type];
    if (!status || !onDeliveryEvent) return;
    try {
      await onDeliveryEvent({
        type: payload.type,
        status,
        resendId: payload.data.email_id,
        timestamp: payload.created_at,
      });
    } catch (err) {
      console.error(`${tag} onDeliveryEvent error`, err);
    }
  }

  return async function POST(req: NextRequest) {
    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
      console.error(`${tag} ${apiKeyEnv} missing`);
      return new Response(JSON.stringify({ error: "no_api_key" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    let payload: ResendInboundPayload;
    try {
      payload = (await req.json()) as ResendInboundPayload;
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    console.log(`${tag}`, payload.type, payload.data?.email_id);

    try {
      if (payload.type === "email.received") {
        await handleInbound(payload, apiKey);
      } else if (DELIVERY_STATUS_MAP[payload.type]) {
        await handleDelivery(payload);
      }
    } catch (err) {
      console.error(`${tag} handler error`, err);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

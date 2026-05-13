import { NextRequest } from "next/server";
import { capturePostHogServer } from "./posthog-capture";

/**
 * Generic email-gated download redirect handler.
 *
 * Companion to `createNewsletterHandler`. The newsletter flow captures the
 * email and emails the user a tokenized download link
 * (e.g. `/api/download?token=<HMAC>`). This factory wires up the GET endpoint
 * that link points at. It:
 *
 *   1. Reads the token from either the configured cookie or the `?token=`
 *      query param.
 *   2. Calls the caller's `verifyToken` (HMAC checks live in the consumer
 *      because the signing secret is app-specific).
 *   3. On invalid token: 302 to `gateRedirect` (defaults to
 *      `/?gate=required&from=download`).
 *   4. On valid token:
 *        - resolves the download URL via `resolveDownloadUrl` (e.g. latest
 *          GitHub release `.dmg` asset),
 *        - fires a server-side PostHog event (default
 *          `download_link_clicked_server`), ground-truth, ad-blocker proof,
 *        - fires the optional `onClick` callback (DB insert lives here),
 *        - 302s to the resolved URL.
 *
 * Bot UAs (LinkedIn / Slack / Twitter link unfurls) are detected and the
 * PostHog event + onClick callback are suppressed for them so funnel stats
 * stay clean. The 302 still fires so previews render.
 */

const BOT_UA_RE = /bot|crawler|spider|Twitterbot|LinkedInBot|Slackbot|facebookexternalhit|Discordbot|TelegramBot|WhatsApp|Applebot|Googlebot|Bingbot|YandexBot|DuckDuckBot|redditbot|Pinterest|Embedly|Snapchat|axios\/|python-requests|python-urllib|node-fetch|^node$|dataminr|Anthill|^Mozilla\/5\.0$|Chrome\/70\.|Nexus 5X Build\/MMB29P|AI-Innovation-Radar|^AFMMainUI|LinkResolver|link-resolver|^Mozilla\/5\.0 \(compatible\)$|^curl\//i;

export interface DownloadHandlerOk {
  ok: true;
  email: string;
}
export interface DownloadHandlerFail {
  ok: false;
  reason: string;
}
export type DownloadHandlerVerifyResult = DownloadHandlerOk | DownloadHandlerFail;

export interface DownloadHandlerClickInfo {
  email: string;
  version: string | null;
  url: string;
  userAgent: string;
  referer: string;
  ip: string | null;
  country: string | null;
  source: "cookie" | "query";
  isBot: boolean;
}

export interface DownloadHandlerConfig {
  /** Site slug, used as a PostHog property (e.g. "claude-meter"). */
  site: string;
  /** Cookie name to read the install token from. */
  cookieName: string;
  /**
   * Verifies the token (HMAC or otherwise). Returns the captured email on
   * success. The signing secret stays in the consumer app because it is
   * app-specific.
   */
  verifyToken: (token: string | undefined | null) => DownloadHandlerVerifyResult;
  /**
   * Resolves the final destination URL (e.g. latest GitHub release .dmg).
   * Called only when the token is valid, so misses cost nothing on bounces.
   */
  resolveDownloadUrl: () => Promise<{ url: string; version: string | null }>;
  /**
   * Builds the Set-Cookie header value to stamp the install token when the
   * request arrived via `?token=` (so subsequent installs on the same browser
   * skip the URL token). If omitted, no cookie is stamped on the query path.
   */
  buildTokenCookie?: (email: string) => string;
  /**
   * Where to bounce on missing / bad token. Defaults to
   * `/?gate=required&from=download`. Relative so it works behind proxies
   * where `req.url` resolves to the internal binding.
   */
  gateRedirect?: string;
  /**
   * Optional DB-logging hook fired AFTER the destination URL is resolved and
   * the PostHog event is sent, but BEFORE the 302 response is returned.
   * Errors are swallowed so a logging miss can't break the download path.
   * Not called for bots.
   */
  onClick?: (info: DownloadHandlerClickInfo) => Promise<void> | void;
  /** PostHog event name. Defaults to `download_link_clicked_server`. */
  posthogEvent?: string;
}

export function createDownloadHandler(config: DownloadHandlerConfig) {
  const {
    site,
    cookieName,
    verifyToken,
    resolveDownloadUrl,
    buildTokenCookie,
    gateRedirect = "/?gate=required&from=download",
    onClick,
    posthogEvent = "download_link_clicked_server",
  } = config;

  return async function GET(req: NextRequest): Promise<Response> {
    const cookieToken = req.cookies.get(cookieName)?.value;
    const queryToken = req.nextUrl.searchParams.get("token") ?? undefined;

    let verdict = verifyToken(cookieToken);
    let acceptedFrom: "cookie" | "query" | null = verdict.ok ? "cookie" : null;
    if (!verdict.ok && queryToken) {
      const queryVerdict = verifyToken(queryToken);
      if (queryVerdict.ok) {
        verdict = queryVerdict;
        acceptedFrom = "query";
      }
    }

    if (!verdict.ok) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: gateRedirect,
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "x-install-gate": verdict.reason ?? "missing",
        },
      });
    }

    const { url, version } = await resolveDownloadUrl();

    const ua = req.headers.get("user-agent") || "";
    const isBot = !ua || BOT_UA_RE.test(ua);
    const referer = req.headers.get("referer") || "";
    const xff = req.headers.get("x-forwarded-for") || "";
    const ip = xff.split(",")[0]?.trim() || null;
    const country = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || null;
    const email = verdict.email;

    if (!isBot) {
      let host: string | undefined;
      try {
        host = req.headers.get("host") || undefined;
      } catch {
        host = undefined;
      }
      void capturePostHogServer({
        event: posthogEvent,
        distinctId: email,
        host,
        properties: {
          email,
          site,
          version,
          source: acceptedFrom,
          referer,
          country,
        },
      });

      if (onClick) {
        try {
          await onClick({
            email,
            version,
            url,
            userAgent: ua,
            referer,
            ip,
            country,
            source: acceptedFrom ?? "cookie",
            isBot,
          });
        } catch (err) {
          console.error("[download-handler] onClick threw:", err);
        }
      }
    }

    const headers = new Headers({
      Location: url,
      "Cache-Control": "private, max-age=0, s-maxage=0",
      "x-install-gate": "ok",
      "x-install-gate-source": acceptedFrom ?? "unknown",
    });
    if (acceptedFrom === "query" && buildTokenCookie) {
      headers.append("Set-Cookie", buildTokenCookie(email));
    }
    return new Response(null, { status: 302, headers });
  };
}

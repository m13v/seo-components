import { NextRequest } from "next/server";

export interface DmShortLinkRedirectConfig {
  /** Site slug, used as a property on the PostHog event (e.g. "pieline"). */
  site: string;
  /**
   * Base URL of the social-autoposter dashboard resolver.
   * Override via env (`SHORT_LINK_RESOLVER_URL`) or pass explicitly. Defaults
   * to https://app.s4l.ai which is where the public /api/short-links/<code>
   * endpoint lives.
   */
  resolverBase?: string;
  /** Env var holding the PostHog public key (default: `NEXT_PUBLIC_POSTHOG_KEY`). */
  posthogKeyEnv?: string;
  /** Env var holding the PostHog host (default: `NEXT_PUBLIC_POSTHOG_HOST`). */
  posthogHostEnv?: string;
}

/**
 * Bot User-Agent regex. Bots (Twitter card prefetch, LinkedIn unfurl,
 * Slack/Discord/Telegram/WhatsApp link-preview crawlers, generic Google/Bing
 * bots) hammer /r/<code> within seconds of mint to fetch link previews. They
 * inflated the legacy `clicks` counter by ~20x. When this regex matches, the
 * resolver:
 *   1. Skips the counter increment (passes `?bot=1` so the server side
 *      records the hit in post_link_clicks / dm_link_clicks with is_bot=true
 *      but does NOT bump post_links.clicks / dm_links.clicks).
 *   2. Skips the PostHog `*_short_link_clicked` event (no fake conversions).
 *   3. Still 302s to target_url so previews render.
 */
const BOT_UA_RE = /bot|crawler|spider|Twitterbot|LinkedInBot|Slackbot|facebookexternalhit|Discordbot|TelegramBot|WhatsApp|Applebot|Googlebot|Bingbot|YandexBot|DuckDuckBot|redditbot|Pinterest|Embedly|Snapchat/i;

/**
 * Factory for `GET /r/[code]`.
 *
 * Each short link maps to a destination URL. Two rails are supported:
 *
 *   DM rail: code is minted from dm_links. Target is a Cal.com / Calendly URL
 *   with full UTM and metadata[utm_*] so cal_bookings closes the loop on which
 *   DM produced the booking. Fires `dm_short_link_clicked` in PostHog.
 *
 *   Post rail: code is minted from post_links (public posts/comments). Target
 *   is typically the product homepage or a landing page. UTM params are injected
 *   at redirect time (utm_source, utm_medium, utm_campaign, utm_content) so
 *   PostHog can stitch the full funnel: post click -> get_started_click ->
 *   schedule_click -> checkout_success. Fires `post_short_link_clicked` in
 *   PostHog.
 *
 * Behavior:
 *   1. Read `code` from the route param. Reject non-alphanumeric / wrong-length.
 *   2. Read User-Agent. If it matches BOT_UA_RE, pass `?bot=1` to the resolver
 *      so it logs the hit but does NOT bump the human-facing counter, and
 *      skip the PostHog event.
 *   3. Hit `<resolverBase>/api/short-links/<code>?bot=<0|1>`. The resolver
 *      always appends a row to post_link_clicks / dm_link_clicks (with
 *      is_bot stamped accordingly). It only increments the legacy clicks
 *      counter and stamps first/last click timestamps when is_bot=false.
 *   4. For post rail links: inject UTM params into the target URL.
 *   5. Fire the appropriate PostHog event (dm_short_link_clicked or
 *      post_short_link_clicked) fire-and-forget, non-blocking; skipped for bots.
 *   6. 302 to the resolved target_url. On miss/error, 302 to "/".
 */
export function createDmShortLinkRedirectHandler(config: DmShortLinkRedirectConfig) {
  const {
    site,
    resolverBase = process.env.SHORT_LINK_RESOLVER_URL || "https://app.s4l.ai",
    posthogKeyEnv = "NEXT_PUBLIC_POSTHOG_KEY",
    posthogHostEnv = "NEXT_PUBLIC_POSTHOG_HOST",
  } = config;
  const RESOLVER = resolverBase.replace(/\/+$/, "");

  return async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ code: string }> }
  ) {
    const { code: rawCode } = await ctx.params;
    const code = (rawCode || "").trim();
    const homeUrl = new URL("/", req.url).toString();

    if (!/^[a-z0-9]{4,32}$/i.test(code)) {
      return Response.redirect(homeUrl, 302);
    }

    // Bot detection lives at the edge so the server side can split humans vs
    // bots in post_link_clicks / dm_link_clicks. Every UTF-8 string the user
    // agent presents passes through this; matched UAs do NOT count as a real
    // click and do NOT fire PostHog events.
    const ua = req.headers.get("user-agent") || "";
    const isBot = BOT_UA_RE.test(ua);
    const referrer = req.headers.get("referer") || "";

    let target: string | null = null;
    let dmId: number | null = null;
    let postId: number | null = null;
    let replyId: number | null = null;
    let project: string | null = null;
    let platform: string | null = null;

    try {
      const params = new URLSearchParams();
      if (isBot) params.set("bot", "1");
      // Forward UA + referrer so the server can persist them in
      // *_link_clicks. We pass them through query params (not headers)
      // because Next.js fetch normalizes some headers and the resolver
      // is a separate origin. Truncate to keep the URL manageable.
      if (ua) params.set("ua", ua.slice(0, 500));
      if (referrer) params.set("ref", referrer.slice(0, 500));
      const qs = params.toString();
      const resolverUrl =
        `${RESOLVER}/api/short-links/${encodeURIComponent(code)}` +
        (qs ? `?${qs}` : "");
      const resp = await fetch(resolverUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (resp.ok) {
        const body = (await resp.json()) as {
          target_url?: string;
          dm_id?: number;
          post_id?: number;
          reply_id?: number;
          project?: string;
          platform?: string;
        };
        if (body.target_url) {
          target = body.target_url;
          dmId = body.dm_id ?? null;
          postId = body.post_id ?? null;
          replyId = body.reply_id ?? null;
          project = body.project ?? null;
          platform = body.platform ?? null;
        }
      }
    } catch (err) {
      console.error("[dm-short-link/redirect] resolver fetch failed:", err);
    }

    // For post rail links (public posts/comments), inject UTM params so
    // PostHog can stitch click -> conversion events. DM rail links already
    // have Cal.com metadata[utm_*] attribution embedded at mint time, so we
    // leave those URLs untouched.
    if (target && (postId != null || replyId != null)) {
      try {
        const targetUrl = new URL(target);
        if (!targetUrl.searchParams.has("utm_source")) {
          if (platform) targetUrl.searchParams.set("utm_source", platform);
          targetUrl.searchParams.set("utm_medium", "social");
          if (project) targetUrl.searchParams.set("utm_campaign", project);
          targetUrl.searchParams.set("utm_content", code);
          target = targetUrl.toString();
        }
      } catch {
        // Keep original target if URL parsing fails (e.g. non-HTTP scheme).
      }
    }

    const posthogKey = process.env[posthogKeyEnv];
    const posthogHost = (process.env[posthogHostEnv] || "https://us.i.posthog.com").replace(/\/+$/, "");

    // Skip both PostHog events for bots: they do not represent intent, and
    // counting them as `*_short_link_clicked` would taint funnel stats.
    // DM rail event
    if (!isBot && target && posthogKey && dmId != null) {
      fetch(`${posthogHost}/i/v0/e/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: posthogKey,
          event: "dm_short_link_clicked",
          distinct_id: `dm_${dmId}`,
          timestamp: new Date().toISOString(),
          properties: { dm_id: dmId, project, platform, code, site },
        }),
      }).catch((err) =>
        console.error("[dm-short-link/redirect] posthog fetch failed:", err)
      );
    }

    // Post rail event
    if (!isBot && target && posthogKey && (postId != null || replyId != null)) {
      fetch(`${posthogHost}/i/v0/e/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: posthogKey,
          event: "post_short_link_clicked",
          distinct_id: `post_${postId ?? replyId}`,
          timestamp: new Date().toISOString(),
          properties: {
            post_id: postId,
            reply_id: replyId,
            project,
            platform,
            code,
            site,
          },
        }),
      }).catch((err) =>
        console.error("[dm-short-link/redirect] posthog fetch failed:", err)
      );
    }

    return Response.redirect(target || homeUrl, 302);
  };
}

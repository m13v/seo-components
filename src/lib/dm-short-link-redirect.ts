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
 *
 * 2026-05-07: extended after live measurement found ~71% of "human" hits in
 * the last 24h were actually generic HTTP libs and stripped-header scrapers
 * that the original "self-identifying bot" regex missed. New buckets:
 *   - Generic HTTP libs (axios, python-requests, python-urllib, node-fetch,
 *     bare "node"). No real browser ever sends these.
 *   - Specific scraper UAs caught in the wild: dataminr (Twitter intel),
 *     Anthill (content scanner).
 *   - Spoofed/empty fingerprints: bare "Mozilla/5.0" (no real browser sends
 *     just this), Chrome/70.x (2018 release, only seen from headless fleets).
 *   - Empty UA is also treated as bot in the caller (see isBot computation
 *     below) since real browsers always send a UA.
 *
 * 2026-05-08: extended again after the post_link_clicks behavioral sweep
 * surfaced three more recurring patterns the regex was missing:
 *   - Nexus 5X Build/MMB29P, the literal Googlebot Smartphone UA template
 *     (Google publishes this; any real Android user is on a current device).
 *   - AI-Innovation-Radar, a named AI/news scraper.
 *   - AFMMainUI/Darwin, Apple's Ads-For-Messages link prefetch (no human tap).
 *
 * 2026-05-10: extended after a 24h click audit found four leak patterns
 * sitting in the human pile:
 *   - LinkResolver/1.0 and link-resolver/1.0 (named link-unfurl bots,
 *     no "bot/crawler" token in the UA).
 *   - Bare "Mozilla/5.0 (compatible)" with no engine info (no real browser
 *     ever sends just this; spoofed minimal fingerprint).
 *   - curl/<version> (generic HTTP client; "axios/" was already caught,
 *     curl was missed).
 */
const BOT_UA_RE = /bot|crawler|spider|Twitterbot|LinkedInBot|Slackbot|facebookexternalhit|Discordbot|TelegramBot|WhatsApp|Applebot|Googlebot|Bingbot|YandexBot|DuckDuckBot|redditbot|Pinterest|Embedly|Snapchat|axios\/|python-requests|python-urllib|node-fetch|^node$|dataminr|Anthill|^Mozilla\/5\.0$|Chrome\/70\.|Nexus 5X Build\/MMB29P|AI-Innovation-Radar|^AFMMainUI|LinkResolver|link-resolver|^Mozilla\/5\.0 \(compatible\)$|^curl\//i;

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
    // Build the public home URL using forwarded headers. On Cloud Run the
    // container is served at `0.0.0.0:8080` internally and Next.js sets
    // `req.url` from that host, so `new URL("/", req.url)` would 302 users to
    // `https://0.0.0.0:8080/` (unreachable). Vercel doesn't have this problem
    // because its proxy rewrites `req.url` to the public host, but we share
    // this handler across Vercel + Cloud Run consumers, so always prefer the
    // forwarded host headers when present.
    const fwdHost =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "";
    const fwdProto =
      req.headers.get("x-forwarded-proto") ||
      (fwdHost && !fwdHost.includes("localhost") ? "https" : "http");
    const homeUrl =
      fwdHost && !/(?:^|\.)0\.0\.0\.0(?::\d+)?$/.test(fwdHost)
        ? `${fwdProto}://${fwdHost}/`
        : new URL("/", req.url).toString();

    if (!/^[a-z0-9]{4,32}$/i.test(code)) {
      return Response.redirect(homeUrl, 302);
    }

    // Bot detection lives at the edge so the server side can split humans vs
    // bots in post_link_clicks / dm_link_clicks. Every UTF-8 string the user
    // agent presents passes through this; matched UAs do NOT count as a real
    // click and do NOT fire PostHog events.
    const ua = req.headers.get("user-agent") || "";
    // Empty UA is treated as bot: real browsers always send one. Stripped-
    // header scrapers were ~6% of "human" hits in the 24h post 2026-05-07
    // measurement.
    const isBot = !ua || BOT_UA_RE.test(ua);
    const referrer = req.headers.get("referer") || "";

    let target: string | null = null;
    let dmId: number | null = null;
    let postId: number | null = null;
    let replyId: number | null = null;
    let project: string | null = null;
    let platform: string | null = null;
    // Newsletter rail attribution: the resolver returns broadcast_id +
    // broadcast_product + recipient_email_hash when the code resolves to
    // newsletter_links. We fire `newsletter_short_link_clicked` so PostHog
    // can stitch the click back to the originating broadcast + recipient.
    let broadcastId: number | null = null;
    let broadcastProduct: string | null = null;
    let recipientEmailHash: string | null = null;

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
          broadcast_id?: number;
          broadcast_product?: string;
          recipient_email_hash?: string;
        };
        if (body.target_url) {
          target = body.target_url;
          dmId = body.dm_id ?? null;
          postId = body.post_id ?? null;
          replyId = body.reply_id ?? null;
          project = body.project ?? null;
          platform = body.platform ?? null;
          broadcastId = body.broadcast_id ?? null;
          broadcastProduct = body.broadcast_product ?? null;
          recipientEmailHash = body.recipient_email_hash ?? null;
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

    // Newsletter rail event. distinct_id is the recipient_email_hash so
    // every click from the same recipient stitches under one identity in
    // PostHog. Properties carry broadcast_id + product so HogQL queries
    // can attribute clicks (and downstream signup events on the same
    // session) back to a specific broadcast x recipient pair.
    if (!isBot && target && posthogKey && broadcastId != null) {
      fetch(`${posthogHost}/i/v0/e/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: posthogKey,
          event: "newsletter_short_link_clicked",
          distinct_id: recipientEmailHash || `newsletter_${broadcastId}`,
          timestamp: new Date().toISOString(),
          properties: {
            broadcast_id: broadcastId,
            broadcast_product: broadcastProduct,
            recipient_email_hash: recipientEmailHash,
            project,
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

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
 *   2. Hit `<resolverBase>/api/short-links/<code>`. The resolver increments the
 *      click counter and stamps first/last click timestamps.
 *   3. For post rail links: inject UTM params into the target URL.
 *   4. Fire the appropriate PostHog event (dm_short_link_clicked or
 *      post_short_link_clicked) fire-and-forget, non-blocking.
 *   5. 302 to the resolved target_url. On miss/error, 302 to "/".
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

    let target: string | null = null;
    let dmId: number | null = null;
    let postId: number | null = null;
    let replyId: number | null = null;
    let project: string | null = null;
    let platform: string | null = null;

    try {
      const resp = await fetch(`${RESOLVER}/api/short-links/${encodeURIComponent(code)}`, {
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

    // DM rail event
    if (target && posthogKey && dmId != null) {
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
    if (target && posthogKey && (postId != null || replyId != null)) {
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

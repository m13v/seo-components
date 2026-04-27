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
 * Each per-DM short link maps to a Cal.com / Calendly URL with full UTM and
 * `metadata[utm_*]` so cal_bookings closes the loop on which DM produced the
 * booking. The cached `target_url` is frozen at mint time on the dms row, so
 * the resolver is a single DB read with no config.json dependency.
 *
 * Behavior:
 *   1. Read `code` from the route param. Reject non-alphanumeric / wrong-length.
 *   2. Hit `<resolverBase>/api/short-links/<code>`. The resolver increments
 *      dms.short_link_clicks and stamps first/last click timestamps.
 *   3. Fire a PostHog `dm_short_link_clicked` event with dm_id, project,
 *      platform, code, site.
 *   4. 302 to the resolved target_url. On miss/error, 302 to "/".
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
          project?: string;
          platform?: string;
        };
        if (body.target_url) {
          target = body.target_url;
          dmId = body.dm_id ?? null;
          project = body.project ?? null;
          platform = body.platform ?? null;
        }
      }
    } catch (err) {
      console.error("[dm-short-link/redirect] resolver fetch failed:", err);
    }

    const posthogKey = process.env[posthogKeyEnv];
    const posthogHost = (process.env[posthogHostEnv] || "https://us.i.posthog.com").replace(/\/+$/, "");
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

    return Response.redirect(target || homeUrl, 302);
  };
}

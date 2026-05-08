// Server-side PostHog capture helper.
//
// PostHog's client-side `posthog.capture()` is killed by ad-blockers (uBlock,
// Brave shields, Privacy Badger), DNT, and any privacy extension that drops
// the /e/ ingest call. That makes any client-only metric (newsletter signups,
// download clicks, schedule clicks) lossy by 30 to 50 percent against the
// real server-truth count.
//
// Use this helper from API routes that already have server-side ground truth
// (a Resend send succeeded, a Cal.com webhook fired, a paid checkout closed)
// to fire a parallel PostHog event from the server. Server captures land on
// the same `events` table, so the dashboard's existing HogQL queries pick
// them up the moment the event clause is updated.
//
// Convention: name server events with a `_server` suffix so they never
// collide with the client event of the same intent. The dashboard chooses
// which one to count; both can coexist for transition windows.

interface CaptureOptions {
  /** Event name. Convention: suffix with `_server` (e.g. "newsletter_subscribed_server"). */
  event: string;
  /**
   * Stable identifier for the user. For email-gated flows this is the
   * lowercased email so PostHog stitches with the client-side identify(email)
   * that fires once the welcome email click drops them back on the site.
   */
  distinctId: string;
  /**
   * Event properties. The helper auto-merges `$host` (so the dashboard's
   * `properties.$host IN (...)` domain filter matches) and a few standard
   * keys, but anything in here wins over the auto-merged values.
   */
  properties?: Record<string, unknown>;
  /**
   * Hostname of the request. Pass `req.headers.get("host")` from a Next.js
   * Route Handler. Used to populate `$host` so events bucket by domain in
   * the dashboard. Falls back to a config default if omitted.
   */
  host?: string;
  /**
   * PostHog write key. Defaults to `process.env.NEXT_PUBLIC_POSTHOG_KEY`,
   * then `process.env.POSTHOG_KEY`. The "public" key is the project's ingest
   * key; it's safe to use server-side because it's already shipped to every
   * browser.
   */
  apiKey?: string;
  /**
   * PostHog ingest host. Defaults to `process.env.NEXT_PUBLIC_POSTHOG_HOST`,
   * then https://us.i.posthog.com.
   */
  apiHost?: string;
}

/**
 * Fire a server-side PostHog capture. Never throws; logs and returns false
 * on any failure so a tracking miss can't take down the calling route.
 *
 * Returns true on a 2xx ingest response, false otherwise.
 */
export async function capturePostHogServer(opts: CaptureOptions): Promise<boolean> {
  const apiKey = opts.apiKey || process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.POSTHOG_KEY;
  if (!apiKey) {
    console.warn("[posthog-server] no PostHog key in env; skipping", opts.event);
    return false;
  }
  const apiHost =
    opts.apiHost || process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  const properties: Record<string, unknown> = {
    ...(opts.host ? { $host: opts.host } : {}),
    source: "server",
    ...(opts.properties || {}),
  };

  try {
    const res = await fetch(`${apiHost.replace(/\/$/, "")}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: opts.event,
        distinct_id: opts.distinctId,
        properties,
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[posthog-server] capture ${opts.event} returned ${res.status}:`,
        detail.slice(0, 200),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[posthog-server] capture ${opts.event} threw:`, err);
    return false;
  }
}

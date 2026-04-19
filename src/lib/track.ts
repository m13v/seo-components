// Canonical analytics helpers. Use these instead of calling
// `posthog.capture("cta_click", ...)` directly so every consumer site
// fires the same event names with the same property shape.
//
// All helpers are no-ops on the server and when PostHog is not loaded.

type PostHogLike = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

function ph(): PostHogLike | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { posthog?: PostHogLike };
  return w.posthog;
}

export interface ScheduleClickProps {
  /** Absolute URL the click sends the user to (e.g. https://cal.com/team/mediar/demo). */
  destination: string;
  /** Short slug identifying the site (e.g. "mediar", "fazm", "cyrano"). Optional: PostHog $host already identifies the site. */
  site?: string;
  /** Section of the page the CTA lives in (e.g. "hero", "footer", "guide-navbar"). */
  section?: string;
  /** Visible button/link text. */
  text?: string;
  /** Name of the rendering component (e.g. "CTAButton", "LeadCaptureModal"). */
  component?: string;
  /** Free-form extra properties — merged last, cannot override reserved keys above. */
  extra?: Record<string, unknown>;
}

/**
 * Fire the canonical `schedule_click` PostHog event. Use for every CTA that
 * sends the user to a booking/scheduling tool (Cal.com, Calendly, meetings.hubspot.com).
 *
 * The dashboard at social-autoposter/scripts/project_stats_json.py counts this
 * event per `$host` to produce the "Schedule Clicks" column in the Project
 * Funnel Stats table.
 */
export function trackScheduleClick(props: ScheduleClickProps): void {
  const posthog = ph();
  if (!posthog) return;
  const { destination, site, section, text, component, extra } = props;
  posthog.capture("schedule_click", {
    ...(extra || {}),
    destination,
    site,
    section,
    text,
    component,
    page: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}

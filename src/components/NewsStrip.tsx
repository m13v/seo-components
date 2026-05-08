"use client";

import { useCapture } from "../lib/analytics-context";

export interface NewsStripProps {
  /** Required: link target. Internal /t/ slugs go to the freshly minted page. */
  href: string;
  /** Required: short eyebrow text displayed in the pill (e.g. "MAY 6"). Defaults to "NEW". */
  pillText?: string;
  /** Required: lead phrase rendered in bold inside the body (e.g. "Anthropic doubled limits."). */
  lead: string;
  /** Required: the wedge / hook explaining why the user should click through. */
  wedge: string;
  /** CTA label pinned right. Defaults to "Read the breakdown". */
  ctaLabel?: string;
  /** Color theme. Defaults to amber for breaking news. */
  tone?: "amber" | "teal" | "rose" | "indigo";
  /** Site slug for analytics events. */
  site?: string;
  /** Section label for analytics events. */
  section?: string;
  /** When true, the pill animates with a pulsing dot. Defaults to true. */
  showDot?: boolean;
  /** Optional ISO date the news lands; surfaced as <time> for SEO/aria. */
  datePublished?: string;
}

const TONES: Record<NonNullable<NewsStripProps["tone"]>, {
  bg: string;
  border: string;
  borderHover: string;
  text: string;
  textStrong: string;
  textWedge: string;
  pillBg: string;
  pillText: string;
  arrow: string;
  shadowRgb: string;
}> = {
  amber: {
    bg: "linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)",
    border: "#fde68a",
    borderHover: "#f59e0b",
    text: "#92400e",
    textStrong: "#78350f",
    textWedge: "#b45309",
    pillBg: "#d97706",
    pillText: "#ffffff",
    arrow: "#b45309",
    shadowRgb: "180, 83, 9",
  },
  teal: {
    bg: "linear-gradient(135deg, #ecfeff 0%, #f0fdfa 100%)",
    border: "#99f6e4",
    borderHover: "#14b8a6",
    text: "#115e59",
    textStrong: "#134e4a",
    textWedge: "#0f766e",
    pillBg: "#0d9488",
    pillText: "#ffffff",
    arrow: "#0f766e",
    shadowRgb: "13, 148, 136",
  },
  rose: {
    bg: "linear-gradient(135deg, #fff1f2 0%, #fef2f2 100%)",
    border: "#fecdd3",
    borderHover: "#f43f5e",
    text: "#9f1239",
    textStrong: "#881337",
    textWedge: "#be123c",
    pillBg: "#e11d48",
    pillText: "#ffffff",
    arrow: "#be123c",
    shadowRgb: "225, 29, 72",
  },
  indigo: {
    bg: "linear-gradient(135deg, #eef2ff 0%, #eff6ff 100%)",
    border: "#c7d2fe",
    borderHover: "#6366f1",
    text: "#3730a3",
    textStrong: "#312e81",
    textWedge: "#4338ca",
    pillBg: "#4f46e5",
    pillText: "#ffffff",
    arrow: "#4338ca",
    shadowRgb: "79, 70, 229",
  },
};

/**
 * <NewsStrip /> — a pinned, pill-anchored, dismiss-free news bar that sits
 * above the hero on a marketing homepage and routes existing organic
 * clickthroughs (e.g. tweets pointing at "/") to a freshly minted dedicated
 * page on a current event.
 *
 * Pattern this component encodes (battle-tested on claude-meter.com on
 * 2026-05-07): a viral post on Twitter/Reddit drives baseline traffic to the
 * homepage. Once a dedicated /t/ analysis ships, every subsequent visitor
 * needs a one-click path from "/" to the deep page. NewsStrip is that path.
 *
 * Renders a single horizontal flex link with three slots:
 *   [pill]  [lead + wedge]  [arrow + cta]
 * Tone is configurable per launch (amber for breaking news, teal/indigo/rose
 * for softer announcements). Wraps gracefully on mobile.
 *
 * Analytics: fires `news_strip_click` via the consumer's PostHog instance
 * (no-op if the page doesn't mount <SeoAnalyticsProvider>).
 */
export function NewsStrip({
  href,
  pillText = "NEW",
  lead,
  wedge,
  ctaLabel = "Read the breakdown",
  tone = "amber",
  site,
  section = "homepage",
  showDot = true,
  datePublished,
}: NewsStripProps) {
  const t = TONES[tone];
  const capture = useCapture();

  const onClick = () => {
    try {
      capture?.("news_strip_click", {
        destination: href,
        site,
        section,
        pill_text: pillText,
        lead,
        tone,
        component: "NewsStrip",
      });
    } catch {
      /* analytics failures must never block navigation */
    }
  };

  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={`${pillText}: ${lead} ${wedge} ${ctaLabel}`}
      style={{
        position: "relative",
        zIndex: 3,
        display: "flex",
        alignItems: "center",
        gap: 14,
        maxWidth: 1240,
        margin: "16px auto 0",
        padding: "12px 22px",
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: `0 1px 0 rgba(${t.shadowRgb}, 0.04), 0 6px 24px -12px rgba(${t.shadowRgb}, 0.18)`,
        textDecoration: "none",
        color: t.text,
        fontSize: 14,
        lineHeight: 1.4,
        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
      }}
      className="news-strip"
      data-tone={tone}
      onMouseOver={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(-1px)";
        el.style.borderColor = t.borderHover;
        el.style.boxShadow = `0 1px 0 rgba(${t.shadowRgb}, 0.08), 0 12px 32px -10px rgba(${t.shadowRgb}, 0.28)`;
      }}
      onMouseOut={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "";
        el.style.borderColor = t.border;
        el.style.boxShadow = `0 1px 0 rgba(${t.shadowRgb}, 0.04), 0 6px 24px -12px rgba(${t.shadowRgb}, 0.18)`;
      }}
    >
      <span
        aria-hidden
        style={{
          flex: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          background: t.pillBg,
          color: t.pillText,
          fontFamily:
            "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
        }}
      >
        {showDot && (
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ffffff",
              animation: "newsStripPulse 2s infinite",
            }}
          />
        )}
        {pillText}
      </span>

      <span style={{ flex: "1 1 auto", minWidth: 0 }}>
        <strong style={{ color: t.textStrong, fontWeight: 700 }}>{lead}</strong>{" "}
        <span style={{ color: t.textWedge }}>{wedge}</span>
        {datePublished && (
          <time
            dateTime={datePublished}
            style={{ display: "none" }}
            aria-hidden
          >
            {datePublished}
          </time>
        )}
      </span>

      <span
        aria-hidden
        style={{
          flex: "none",
          fontFamily:
            "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          fontWeight: 600,
          color: t.arrow,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {ctaLabel} &rarr;
      </span>

      <style>{`
        @keyframes newsStripPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.6); }
          50%      { box-shadow: 0 0 0 4px rgba(255, 255, 255, 0); }
        }
        @media (max-width: 720px) {
          a.news-strip {
            margin: 12px 18px 0 !important;
            padding: 10px 14px !important;
            border-radius: 14px !important;
            flex-wrap: wrap;
            font-size: 13px !important;
          }
        }
      `}</style>
    </a>
  );
}

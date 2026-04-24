"use client";

import { useEffect, useState, type RefObject } from "react";

type Options = {
  component: string;
  minWidth: number;
};

export function useLayoutAnchorGuard(
  ref: RefObject<HTMLElement | null>,
  { component, minWidth }: Options,
): string | null {
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;

    const check = () => {
      const el = ref.current;
      if (!el) return;
      if (window.innerWidth < minWidth) return;
      const top = Math.round(el.getBoundingClientRect().top);
      if (top <= 100) return;
      const msg =
        `[@m13v/seo-components] ${component} is stranded at top=${top}px. ` +
        `Sticky anchor lost — this component must be a flex-row sibling of <main>. ` +
        `Wrap <${component}/> and your main content in ` +
        `<div className="flex min-h-screen"> inside <body>. ` +
        `See social-autoposter setup-client-website skill, Phase 2d.`;
      // eslint-disable-next-line no-console
      console.error(msg);
      setWarning(msg);
    };

    const t = window.setTimeout(check, 250);
    return () => window.clearTimeout(t);
    // Run once on mount. Ref identity is stable; options are caller-static.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return warning;
}

export function LayoutAnchorWarningBanner({
  message,
}: {
  message: string | null;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2147483646,
        background: "#dc2626",
        color: "#fff",
        padding: "10px 16px",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "12px",
        lineHeight: 1.45,
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
      }}
    >
      <strong style={{ marginRight: 8 }}>
        Layout misconfigured (dev only):
      </strong>
      {message}
    </div>
  );
}

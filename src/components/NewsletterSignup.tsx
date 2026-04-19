"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCapture } from "../lib/analytics-context";

export interface NewsletterSignupProps {
  /** Text shown next to the input on desktop */
  description?: string;
  /** Button label */
  buttonLabel?: string;
  /** API route to POST the email to (default: "/api/newsletter") */
  endpoint?: string;
  /** Scroll distance (px) before the bar appears */
  scrollThreshold?: number;
  /** Message shown after successful signup */
  successMessage?: string;
  /** Placeholder text in the email input */
  placeholder?: string;
}

export function NewsletterSignup({
  description = "Get the latest guides and updates delivered to your inbox.",
  buttonLabel = "Subscribe",
  endpoint = "/api/newsletter",
  scrollThreshold = 600,
  successMessage = "You're subscribed! Check your inbox.",
  placeholder = "you@example.com",
}: NewsletterSignupProps) {
  const capture = useCapture();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > scrollThreshold);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, [scrollThreshold]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");

      capture("newsletter_subscribed", {
        component: "NewsletterSignup",
        page: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-xl py-3 px-4 sm:px-6 bg-white/90 dark:bg-zinc-900/90"
        >
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
            {status === "success" ? (
              <p className="text-sm font-medium text-teal-600 dark:text-teal-400 flex-1">
                {successMessage}
              </p>
            ) : (
              <>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 hidden md:block flex-shrink-0">
                  {description}
                </p>
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-2 flex-1 md:flex-initial md:min-w-[340px]"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-shadow"
                    disabled={status === "loading"}
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="text-sm font-medium px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors disabled:opacity-60 whitespace-nowrap"
                  >
                    {status === "loading" ? "..." : buttonLabel}
                  </button>
                </form>
              </>
            )}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-zinc-400 hover:text-zinc-600 transition-colors ml-1 flex-shrink-0"
              aria-label="Dismiss"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {status === "error" && errorMsg && (
            <div className="mx-auto max-w-7xl mt-1">
              <p className="text-xs text-red-500">{errorMsg}</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

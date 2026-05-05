"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackGetStartedClick } from "../lib/track";
import { useCapture } from "../lib/analytics-context";

const DEFAULT_STORAGE_KEY = "install_email_captured";

export function hasCapturedInstallEmail(storageKey = DEFAULT_STORAGE_KEY): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem(storageKey);
  } catch {
    return false;
  }
}

export function markInstallEmailCaptured(value: string, storageKey = DEFAULT_STORAGE_KEY) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, value);
  } catch {
    /* localStorage optional */
  }
}

export interface InstallConfigBlock {
  /** Header label above the code block (e.g. "Add to your MCP client config"). */
  label: string;
  /** Code/JSON contents of the block. */
  code: string;
}

export interface InstallEmailGateProps {
  /** The shell command revealed and copyable after email capture. */
  command: string;
  /** Optional second code block (e.g. an MCP client JSON config) shown beneath the command. */
  configBlock?: InstallConfigBlock;
  /** Site slug for analytics (e.g. "s4l", "assrt", "macos-use"). */
  site?: string;
  /** Section the gate lives in (e.g. "hero", "final-cta"). Used in PostHog events. */
  section?: string;
  /** Trigger button text. Defaults to "Get the install command". */
  label?: string;
  /** Visual style for the trigger button. */
  variant?: "primary" | "secondary";
  /** Extra classes on the trigger button. */
  className?: string;
  /** Optional GitHub URL surfaced as a link inside the command-revealed stage. */
  githubUrl?: string;
  /** Stage 1 modal heading. */
  modalTitle?: string;
  /** Stage 1 modal body copy. */
  modalDescription?: string;
  /** Stage 2 (command revealed) heading. */
  commandTitle?: string;
  /** Stage 2 (command revealed) body copy. */
  commandDescription?: string;
  /** Footer note in stage 2 (rendered as small text). */
  commandFooter?: React.ReactNode;
  /** Submit button label on the email form. */
  submitLabel?: string;
  /** When true (default), remembers capture in localStorage and skips the email step on subsequent clicks. */
  remember?: boolean;
  /** localStorage key used when `remember` is enabled. Set per-site to keep gates independent. */
  storageKey?: string;
  /** Newsletter API path. Defaults to /api/newsletter. */
  newsletterPath?: string;
  /** Render a custom trigger element instead of the default button. Receives an onClick handler. */
  renderTrigger?: (props: { onClick: () => void; disabled?: boolean }) => React.ReactNode;
}

type Stage = "closed" | "email" | "command";

export function InstallEmailGate({
  command,
  configBlock,
  site,
  section = "hero",
  label = "Get the install command",
  variant = "primary",
  className = "",
  githubUrl,
  modalTitle = "Get the install command",
  modalDescription = "Drop your email and we'll show you the one-line install plus the occasional update. No spam.",
  commandTitle = "Run this in your terminal",
  commandDescription,
  commandFooter,
  submitLabel = "Show me the command",
  remember = true,
  storageKey = DEFAULT_STORAGE_KEY,
  newsletterPath = "/api/newsletter",
  renderTrigger,
}: InstallEmailGateProps) {
  const capture = useCapture();
  const [stage, setStage] = useState<Stage>("closed");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"command" | "config" | null>(null);

  useEffect(() => {
    if (stage === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStage("closed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage]);

  useEffect(() => {
    if (stage === "closed") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [stage]);

  const onOpen = () => {
    const skip = remember && hasCapturedInstallEmail(storageKey);
    if (skip) {
      // Gate already passed previously: fire the canonical funnel event for
      // the gated-passed click. No event when the gate is fresh and we're
      // about to ask for the email; that fires on submit instead.
      trackGetStartedClick({
        destination: "modal:command",
        site,
        section,
        text: label,
        component: "InstallEmailGate",
      });
    }
    setStage(skip ? "command" : "email");
    setError("");
  };

  const onSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(newsletterPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.status >= 400 && res.status < 500) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not save that email. Try again.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        console.warn("[InstallEmailGate] newsletter POST failed", res.status);
      }
      if (remember) markInstallEmailCaptured(trimmed, storageKey);
      capture("newsletter_subscribed", {
        component: "InstallEmailGate",
        email: trimmed,
        page: typeof window !== "undefined" ? window.location.pathname : undefined,
        site,
        section,
        source: "install_gate",
      });
      trackGetStartedClick({
        destination: "modal:command",
        site,
        section,
        text: "email-submitted",
        component: "InstallEmailGate",
        extra: { email: trimmed },
      });
      setStage("command");
    } catch (err) {
      console.warn("[InstallEmailGate] newsletter POST network error", err);
      if (remember) markInstallEmailCaptured(trimmed, storageKey);
      setStage("command");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (which: "command" | "config", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      // Track the copy as its own event so it does not inflate the
      // canonical `get_started_click` funnel. The gate event fires once
      // when the email is submitted (or once on each subsequent gated-
      // passed click), not for every clipboard copy.
      capture("install_command_copied", {
        component: "InstallEmailGate",
        site,
        section,
        which,
        page: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  const buttonClass =
    variant === "primary"
      ? "group inline-flex h-11 items-center gap-2 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
      : "inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-400";

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ onClick: onOpen })
      ) : (
        <button type="button" onClick={onOpen} className={`${buttonClass} ${className}`.trim()}>
          {label}
          {variant === "primary" && (
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          )}
        </button>
      )}

      <AnimatePresence>
        {stage !== "closed" && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-4 backdrop-blur-sm"
            onClick={() => setStage("closed")}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {stage === "email" && (
                <div className="p-7">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                        {modalTitle}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                        {modalDescription}
                      </p>
                    </div>
                    <CloseButton onClick={() => setStage("closed")} />
                  </div>

                  <form onSubmit={onSubmitEmail} className="space-y-3">
                    <input
                      type="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                      disabled={submitting}
                    />
                    {error && <p className="text-xs font-medium text-red-600">{error}</p>}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
                    >
                      {submitting ? "Sending…" : submitLabel}
                    </button>
                  </form>
                  <p className="mt-4 text-xs text-zinc-500">
                    Already subscribed? Submit anyway, the command unlocks either way.
                  </p>
                </div>
              )}

              {stage === "command" && (
                <div className="p-7">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                        {commandTitle}
                      </h2>
                      {commandDescription && (
                        <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                          {commandDescription}
                        </p>
                      )}
                    </div>
                    <CloseButton onClick={() => setStage("closed")} />
                  </div>

                  {configBlock && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      1. Install
                    </p>
                  )}
                  <CodeBlock
                    code={command}
                    prefix="$ "
                    onCopy={() => copy("command", command)}
                    copied={copied === "command"}
                    className={configBlock ? "mt-2" : ""}
                  />

                  {configBlock && (
                    <>
                      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        2. {configBlock.label}
                      </p>
                      <CodeBlock
                        code={configBlock.code}
                        onCopy={() => copy("config", configBlock.code)}
                        copied={copied === "config"}
                        className="mt-2"
                        textSize="text-xs"
                      />
                    </>
                  )}

                  {commandFooter && (
                    <div className="mt-4 text-xs text-zinc-500">{commandFooter}</div>
                  )}

                  <div className="mt-5 flex items-center justify-between gap-3">
                    {githubUrl ? (
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-teal-700 hover:text-teal-800"
                      >
                        View on GitHub →
                      </a>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => setStage("closed")}
                      className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mr-2 -mt-2 rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
      aria-label="Close"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function CodeBlock({
  code,
  prefix,
  onCopy,
  copied,
  className = "",
  textSize = "text-sm",
}: {
  code: string;
  prefix?: string;
  onCopy: () => void;
  copied: boolean;
  className?: string;
  textSize?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-md border border-zinc-200 bg-zinc-950 ${className}`.trim()}>
      <pre className={`overflow-x-auto px-4 py-3.5 font-mono ${textSize} text-zinc-100`}>
        <code>
          {prefix && <span className="text-zinc-500">{prefix}</span>}
          {code}
        </code>
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-100 transition hover:bg-zinc-700"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

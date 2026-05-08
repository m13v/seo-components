"use client";

/**
 * FounderChatPanel — floating chat-with-founder widget.
 *
 * Backend: Next.js API routes on social-autoposter-website
 * (POST /api/web-chat/send, GET /api/web-chat/thread/:threadId). Messages
 * land in the same Neon DB social-autoposter uses; the local
 * check-web-chats.sh launchd job picks them up every 15s, spawns Claude
 * per WEB-CHAT-SKILL.md, replies are forwarded to the visitor's email AND
 * surface here via the poll.
 *
 * Visitor identity: a localStorage-scoped nanoid ("web_<id>"). Emails are
 * captured on the first message and required for reply forwarding when the
 * widget is closed.
 *
 * Usage on a consumer site (mediar.ai, fazm.ai, assrt.ai, etc.):
 *
 *   <FounderChatPanel project="mediar" />
 *
 * Optional props:
 *   apiOrigin   override the default social-autoposter-website endpoint
 *   founderName "matt", shown next to messages
 *   greeting    initial system bubble copy
 *   replyEta    "usually within 2 hours" line under greeting
 *   accent      tailwind color name for the bubble (default: "teal")
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_API_ORIGIN = "https://social-autoposter-website.vercel.app";
const POLL_INTERVAL_MS = 30_000;

type Sender = "visitor" | "agent" | "founder";

interface ApiMessage {
  id: number;
  sender: Sender;
  sender_name: string;
  text: string;
  createdAt: string;
}

interface ApiThread {
  threadId: string;
  project: string;
  messages: ApiMessage[];
}

export interface FounderChatPanelProps {
  /** config.json projects[].name (case-sensitive). e.g. "mediar", "fazm". */
  project: string;
  apiOrigin?: string;
  founderName?: string;
  greeting?: string;
  replyEta?: string;
  /** Whether to require email before allowing the first message (default: true). */
  requireEmail?: boolean;
}

function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const ph = (window as unknown as { posthog?: { capture?: (e: string, p?: object) => void } }).posthog;
  ph?.capture?.(event, props);
}

function nanoid(prefix: string, n = 16): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = prefix;
  const arr = new Uint8Array(n);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < n; i++) out += alphabet[arr[i] % alphabet.length];
  return out;
}

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  const key = "fcp_visitor_id";
  let v = window.localStorage.getItem(key);
  if (!v) {
    v = nanoid("web_", 16);
    window.localStorage.setItem(key, v);
  }
  return v;
}

function getStoredThreadId(project: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`fcp_thread_${project}`);
}

function setStoredThreadId(project: string, threadId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`fcp_thread_${project}`, threadId);
}

function getStoredEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("fcp_email");
}

function setStoredEmail(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("fcp_email", email);
}

export function FounderChatPanel({
  project,
  apiOrigin = DEFAULT_API_ORIGIN,
  founderName = "matt",
  greeting,
  replyEta = "usually replies within a couple hours",
  requireEmail = true,
}: FounderChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [email, setEmail] = useState<string>("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visitorIdRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Init: visitorId + restore existing thread + email.
  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId();
    const stored = getStoredThreadId(project);
    if (stored) setThreadId(stored);
    const storedEmail = getStoredEmail();
    if (storedEmail) {
      setEmail(storedEmail);
      setEmailSubmitted(true);
    }
  }, [project]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, open]);

  // Poll when open + we have a threadId.
  const fetchThread = useCallback(async () => {
    if (!threadId) return;
    try {
      const res = await fetch(`${apiOrigin}/api/web-chat/thread/${threadId}`);
      if (!res.ok) return;
      const data: ApiThread = await res.json();
      setMessages(data.messages || []);
    } catch {
      /* ignore transient errors */
    }
  }, [apiOrigin, threadId]);

  useEffect(() => {
    if (!open) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }
    fetchThread();
    pollTimerRef.current = setInterval(fetchThread, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [open, fetchThread]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (requireEmail && !emailSubmitted) {
      setError("add your email so matt can reply when you're not on the page");
      return;
    }
    setSending(true);
    setError(null);

    const optimistic: ApiMessage = {
      id: -Date.now(),
      sender: "visitor",
      sender_name: email || "you",
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setDraft("");

    try {
      const body = {
        project,
        visitorId: visitorIdRef.current,
        threadId: threadId || undefined,
        text,
        email: email || undefined,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      };
      const res = await fetch(`${apiOrigin}/api/web-chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`send failed: ${res.status} ${errText}`);
      }
      const data: { threadId: string; messageId: number } = await res.json();
      if (!threadId) {
        setThreadId(data.threadId);
        setStoredThreadId(project, data.threadId);
      }
      capture("founder_chat_message_sent", { project, threadId: data.threadId });
      // Re-fetch to drop the optimistic placeholder for the real row.
      setTimeout(fetchThread, 600);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "send failed";
      setError(msg);
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }, [apiOrigin, draft, email, emailSubmitted, fetchThread, project, requireEmail, sending, threadId]);

  const onSubmitEmail = useCallback(() => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("that doesn't look like a valid email");
      return;
    }
    setStoredEmail(trimmed);
    setEmailSubmitted(true);
    setError(null);
    capture("founder_chat_email_submitted", { project });
  }, [email, project]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    capture("founder_chat_opened", { project });
  }, [project]);

  const greetingText = useMemo(() => {
    if (greeting) return greeting;
    return `hey, i'm ${founderName}, the founder. drop a question or feedback and i'll get back to you.`;
  }, [founderName, greeting]);

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 9999,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Chat with ${founderName}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            background: "#0d9488",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            boxShadow: "0 8px 28px rgba(13,148,136,0.35)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#fff",
              color: "#0d9488",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {founderName.slice(0, 1).toUpperCase()}
          </span>
          chat with {founderName}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={`Chat with ${founderName}`}
          style={{
            width: 360,
            maxWidth: "calc(100vw - 40px)",
            height: 520,
            maxHeight: "calc(100vh - 80px)",
            background: "#fff",
            color: "#0f172a",
            borderRadius: 16,
            boxShadow: "0 24px 64px rgba(15,23,42,0.25)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <header
            style={{
              padding: "14px 16px",
              background: "#0d9488",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                aria-hidden
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "#fff",
                  color: "#0d9488",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {founderName.slice(0, 1).toUpperCase()}
              </span>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{founderName}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{replyEta}</div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 20,
                cursor: "pointer",
                lineHeight: 1,
                padding: 4,
              }}
            >
              ×
            </button>
          </header>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                alignSelf: "flex-start",
                maxWidth: "85%",
                padding: "10px 12px",
                borderRadius: 12,
                background: "#fff",
                color: "#0f172a",
                fontSize: 14,
                lineHeight: 1.45,
                boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
              }}
            >
              {greetingText}
            </div>

            {messages.map((m) => {
              const isVisitor = m.sender === "visitor";
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isVisitor ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: isVisitor ? "#0d9488" : "#fff",
                    color: isVisitor ? "#fff" : "#0f172a",
                    fontSize: 14,
                    lineHeight: 1.45,
                    boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.text}
                </div>
              );
            })}
          </div>

          <footer
            style={{
              padding: "12px 14px",
              borderTop: "1px solid rgba(15,23,42,0.08)",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {requireEmail && !emailSubmitted ? (
              <>
                <label style={{ fontSize: 12, color: "#475569" }}>
                  your email (so i can reply when you're not on the page)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onSubmitEmail();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(15,23,42,0.15)",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={onSubmitEmail}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#0d9488",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    continue
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  placeholder="type a message…"
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  style={{
                    flex: 1,
                    resize: "none",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(15,23,42,0.15)",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.45,
                    minHeight: 40,
                    maxHeight: 120,
                  }}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  style={{
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "none",
                    background: sending || !draft.trim() ? "#94a3b8" : "#0d9488",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: sending || !draft.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {sending ? "…" : "send"}
                </button>
              </div>
            )}

            {error && (
              <div style={{ fontSize: 12, color: "#dc2626" }}>{error}</div>
            )}
          </footer>
        </div>
      )}
    </div>
  );
}

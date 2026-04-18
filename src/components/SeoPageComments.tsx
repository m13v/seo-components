"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthorToken, getStoredName, setStoredName } from "../lib/author-token";

export interface SeoPageCommentsProps {
  site: string;
  pageSlug: string;
  apiOrigin: string;
  title?: string;
  placeholder?: string;
  emptyMessage?: string;
  lockedMessage?: string;
  className?: string;
}

function unlockKey(site: string, pageSlug: string): string {
  return `seo_comments_unlocked:${site}:${pageSlug}`;
}

function readUnlocked(site: string, pageSlug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(unlockKey(site, pageSlug)) === "1";
  } catch {
    return false;
  }
}

function writeUnlocked(site: string, pageSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(unlockKey(site, pageSlug), "1");
  } catch {
    // no-op
  }
}

interface Comment {
  id: number;
  author_name: string | null;
  body: string;
  parent_id: number | null;
  created_at: string;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 14) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function SeoPageComments({
  site,
  pageSlug,
  apiOrigin,
  title = "Comments",
  placeholder = "Share your thoughts. No account needed.",
  emptyMessage = "Be the first to comment.",
  lockedMessage = "Leave a comment to see what others are saying.",
  className = "",
}: SeoPageCommentsProps) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [token, setToken] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setToken(getAuthorToken());
    setName(getStoredName());
    setUnlocked(readUnlocked(site, pageSlug));
  }, [site, pageSlug]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiOrigin}/api/seo-page-comments?site=${encodeURIComponent(site)}&page_slug=${encodeURIComponent(pageSlug)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { comments: Comment[] };
      setComments(data.comments);
    } catch {
      // no-op
    }
  }, [apiOrigin, site, pageSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const { top, children } = useMemo(() => {
    const top: Comment[] = [];
    const children: Record<number, Comment[]> = {};
    for (const c of comments ?? []) {
      if (c.parent_id == null) top.push(c);
      else (children[c.parent_id] ??= []).push(c);
    }
    return { top, children };
  }, [comments]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${apiOrigin}/api/seo-page-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site,
          page_slug: pageSlug,
          author_token: token,
          author_name: name.trim() || null,
          body: trimmed,
          parent_id: replyTo,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(data.error || "Could not post comment");
        setStatus("error");
        return;
      }
      setStoredName(name.trim());
      setBody("");
      setReplyTo(null);
      setStatus("idle");
      writeUnlocked(site, pageSlug);
      setUnlocked(true);
      await load();
    } catch {
      setErrorMsg("Network error");
      setStatus("error");
    }
  }

  return (
    <section className={`seo-page-comments mx-auto max-w-2xl my-12 ${className}`}>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{title}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Public and anonymous. No signup.</p>

      <form onSubmit={submit} className="mb-8 space-y-2">
        {replyTo != null && (
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
            <span>Replying to comment #{replyTo}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="underline hover:text-zinc-700">
              cancel
            </button>
          </div>
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={4000}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-[var(--seo-accent,#14b8a6)]"
          style={{ outlineColor: "var(--seo-accent, #14b8a6)" }}
          disabled={status === "loading"}
        />
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 80))}
            placeholder="Name (optional)"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2"
            disabled={status === "loading"}
          />
          <button
            type="submit"
            disabled={status === "loading" || !body.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: "var(--seo-accent, #14b8a6)" }}
          >
            {status === "loading" ? "Posting…" : replyTo != null ? "Post reply" : "Post comment"}
          </button>
        </div>
        {status === "error" && errorMsg && <p className="text-xs text-red-500 px-1">{errorMsg}</p>}
      </form>

      <div className="space-y-6">
        {!unlocked ? (
          <div
            className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 px-4 py-6 text-center"
            aria-live="polite"
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{lockedMessage}</p>
          </div>
        ) : comments == null ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : top.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
        ) : (
          top.map((c) => (
            <div key={c.id}>
              <CommentRow c={c} onReply={() => setReplyTo(c.id)} />
              {(children[c.id] ?? []).length > 0 && (
                <div className="mt-3 ml-6 pl-4 border-l border-zinc-200 dark:border-zinc-800 space-y-4">
                  {children[c.id].map((r) => (
                    <CommentRow key={r.id} c={r} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function CommentRow({ c, onReply }: { c: Comment; onReply?: () => void }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{c.author_name || "Anonymous"}</span>
        <span className="text-xs text-zinc-400">{formatWhen(c.created_at)}</span>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{c.body}</p>
      {onReply && (
        <button
          type="button"
          onClick={onReply}
          className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 underline"
        >
          Reply
        </button>
      )}
    </div>
  );
}

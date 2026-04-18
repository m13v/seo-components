"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthorToken } from "../lib/author-token";

export interface SeoPageReactionsProps {
  site: string;
  pageSlug: string;
  apiOrigin: string;
  className?: string;
  label?: string;
  lockedHint?: string;
}

const REACTIONS = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "insightful", emoji: "💡", label: "Insightful" },
  { key: "clap", emoji: "👏", label: "Clap" },
  { key: "laugh", emoji: "😂", label: "Funny" },
] as const;

type ReactionKey = (typeof REACTIONS)[number]["key"];

export function SeoPageReactions({
  site,
  pageSlug,
  apiOrigin,
  className = "",
  label = "How did this page land for you?",
  lockedHint = "React to reveal totals",
}: SeoPageReactionsProps) {
  const [counts, setCounts] = useState<Record<ReactionKey, number>>({
    like: 0,
    love: 0,
    insightful: 0,
    clap: 0,
    laugh: 0,
  });
  const [mine, setMine] = useState<Set<ReactionKey>>(new Set());
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<ReactionKey | null>(null);

  useEffect(() => {
    setToken(getAuthorToken());
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `${apiOrigin}/api/seo-page-reactions?site=${encodeURIComponent(site)}&page_slug=${encodeURIComponent(pageSlug)}&author_token=${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { counts: Record<ReactionKey, number>; mine: ReactionKey[] };
      setCounts(data.counts);
      setMine(new Set(data.mine));
    } catch {
      // no-op
    }
  }, [apiOrigin, site, pageSlug, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(reaction: ReactionKey) {
    if (!token || busy) return;
    const wasActive = mine.has(reaction);
    setBusy(reaction);
    const nextMine = new Set(mine);
    if (wasActive) nextMine.delete(reaction);
    else nextMine.add(reaction);
    setMine(nextMine);
    setCounts((c) => ({ ...c, [reaction]: Math.max(0, c[reaction] + (wasActive ? -1 : 1)) }));
    try {
      await fetch(`${apiOrigin}/api/seo-page-reactions`, {
        method: wasActive ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, page_slug: pageSlug, author_token: token, reaction }),
      });
      await load();
    } catch {
      await load();
    } finally {
      setBusy(null);
    }
  }

  const unlocked = mine.size > 0;

  return (
    <div className={`seo-page-reactions mx-auto max-w-2xl my-8 ${className}`}>
      {label && <p className="text-sm text-zinc-500 mb-2">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map((r) => {
          const active = mine.has(r.key);
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => toggle(r.key)}
              disabled={busy !== null}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                active
                  ? "border-[var(--seo-accent,#14b8a6)] text-[var(--seo-accent,#14b8a6)] bg-[var(--seo-accent-light,rgba(20,184,166,0.08))]"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
              }`}
              aria-pressed={active}
              aria-label={unlocked ? `${r.label}: ${counts[r.key]}` : r.label}
            >
              <span className="text-base leading-none">{r.emoji}</span>
              {unlocked ? (
                <span className="font-medium tabular-nums">{counts[r.key]}</span>
              ) : (
                <span
                  className="font-medium tabular-nums select-none text-zinc-300 dark:text-zinc-600"
                  aria-hidden="true"
                >
                  ••
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!unlocked && lockedHint && (
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">{lockedHint}</p>
      )}
    </div>
  );
}

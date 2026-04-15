"use client";

import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  useThreadRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  PostHog helper (works with any posthog setup on window or global)  */
/* ------------------------------------------------------------------ */

function capture(event: string, props?: Record<string, unknown>) {
  const w = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
  const ph = w?.posthog as
    | { capture?: (e: string, p?: Record<string, unknown>) => void; __loaded?: boolean }
    | undefined;
  ph?.capture?.(event, props);
}

function onPosthogLoaded(fn: () => void) {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  const ph = w.posthog as { __loaded?: boolean } | undefined;
  if (ph?.__loaded) {
    fn();
  } else {
    window.addEventListener("posthog:loaded", fn, { once: true });
  }
}

/* ------------------------------------------------------------------ */
/*  Slug extraction                                                    */
/* ------------------------------------------------------------------ */

function slugFromPath(pathname: string | null, pattern?: RegExp): string {
  if (!pathname) return "";
  const re = pattern ?? /^\/t\/([^/]+)/;
  const m = pathname.match(re);
  return m ? m[1] : "";
}

/* ------------------------------------------------------------------ */
/*  Chat adapter                                                       */
/* ------------------------------------------------------------------ */

function makeAdapter(
  getSlug: () => string,
  apiEndpoint: string,
  app: string,
): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const slug = getSlug();
      const lastUserMsg = messages[messages.length - 1];
      const userQuery =
        lastUserMsg?.content
          .map((p) => (p.type === "text" ? p.text : ""))
          .join("") ?? "";

      const payload = {
        slug,
        messages: messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content
            .map((p) => (p.type === "text" ? p.text : ""))
            .join(""),
        })),
      };

      capture("guide_chat_message_sent", {
        app,
        slug,
        query: userQuery,
        query_length: userQuery.length,
        message_count: messages.length,
      });

      const startedAt = Date.now();
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortSignal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        capture("guide_chat_response_failed", {
          app,
          slug,
          query: userQuery,
          status: res.status,
          error: errText || "no body",
          latency_ms: Date.now() - startedAt,
        });
        throw new Error(`guide-chat ${res.status}: ${errText || "no body"}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";
      let toolRounds = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let model = "";
      let requestId = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const evt = JSON.parse(trimmed) as
              | { type: "delta"; text: string }
              | {
                  type: "done";
                  usage: { inputTokens?: number; outputTokens?: number };
                  requestId: string;
                  toolRounds?: number;
                  model?: string;
                }
              | { type: "error"; error: string };
            if (evt.type === "delta") {
              accumulated += evt.text;
              yield { content: [{ type: "text", text: accumulated }] };
            } else if (evt.type === "done") {
              toolRounds = evt.toolRounds ?? 0;
              inputTokens = evt.usage?.inputTokens ?? 0;
              outputTokens = evt.usage?.outputTokens ?? 0;
              model = evt.model ?? "";
              requestId = evt.requestId ?? "";
            } else if (evt.type === "error") {
              throw new Error(evt.error);
            }
          } catch {
            // ignore malformed line
          }
        }
      }

      capture("guide_chat_response_received", {
        app,
        slug,
        query: userQuery,
        response: accumulated,
        response_length: accumulated.length,
        latency_ms: Date.now() - startedAt,
        tool_rounds: toolRounds,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        model,
        request_id: requestId,
      });

      yield {
        content: [{ type: "text", text: accumulated }],
        status: { type: "complete", reason: "stop" },
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Summary hook                                                       */
/* ------------------------------------------------------------------ */

interface SummaryData {
  text: string | null;
  questions: string[];
  loading: boolean;
  slug: string;
}

function useSummary(
  slug: string,
  apiEndpoint: string,
  app: string,
): SummaryData {
  const [text, setText] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setText(null);
    setQuestions([]);

    const ac = new AbortController();
    const startedAt = Date.now();

    (async () => {
      try {
        const res = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slug,
            messages: [
              {
                role: "user",
                content:
                  "Briefly summarize what this article covers and what the reader will learn from it in 2-3 sentences. Focus on the article's content and key takeaways, not on describing the product itself. Then write a line containing only three dashes (---). Then list exactly 3 follow-up questions a reader of this article might ask, one per line.",
              },
            ],
          }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          setLoading(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let accumulated = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const evt = JSON.parse(trimmed) as
                | { type: "delta"; text: string }
                | { type: "done" }
                | { type: "error" };
              if (evt.type === "delta") accumulated += evt.text;
            } catch {
              /* skip */
            }
          }
        }

        const halves = accumulated.split("---");
        const summaryText = halves[0].trim();
        const qRaw = halves.slice(1).join("---").trim();
        const qs = qRaw
          .split("\n")
          .map((l) =>
            l
              .replace(/^\d+[\.\)]\s*/, "")
              .replace(/^\*+\s*/, "")
              .replace(/\*+$/, "")
              .trim(),
          )
          .filter((l) => l.length > 10)
          .slice(0, 3);

        setText(summaryText || null);
        setQuestions(qs);

        capture("guide_chat_summary_loaded", {
          app,
          slug,
          summary: summaryText || "",
          summary_length: summaryText.length,
          questions: qs,
          question_count: qs.length,
          latency_ms: Date.now() - startedAt,
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("[guide-chat] summary fetch:", e);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [slug, apiEndpoint, app]);

  return { text, questions, loading, slug };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface GuideChatPanelProps {
  /** App identifier for analytics (e.g. "cyrano") */
  app?: string;
  /** API endpoint for the guide chat. Defaults to "/api/guide-chat" */
  apiEndpoint?: string;
  /** Regex to extract slug from pathname. Must have one capture group. Defaults to /^\\/t\\/([^/]+)/ */
  slugPattern?: RegExp;
  /** Panel header label. Defaults to "page assistant" */
  label?: string;
}

export function GuideChatPanel({
  app = "default",
  apiEndpoint = "/api/guide-chat",
  slugPattern,
  label = "page assistant",
}: GuideChatPanelProps) {
  const pathname = usePathname();
  const slug = slugFromPath(pathname, slugPattern);

  useEffect(() => {
    if (!slug) return;
    onPosthogLoaded(() =>
      capture("guide_chat_panel_viewed", { app, slug }),
    );
  }, [slug, app]);

  if (!slug) return null;

  return (
    <aside className="hidden lg:flex flex-col sticky top-0 h-screen w-80 xl:w-96 bg-white border-l border-zinc-200">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
        <span className="font-mono text-xs tracking-tight text-zinc-900">
          {label}
        </span>
      </div>
      <ChatThread
        key={slug}
        slug={slug}
        apiEndpoint={apiEndpoint}
        app={app}
      />
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat thread                                                        */
/* ------------------------------------------------------------------ */

function ChatThread({
  slug,
  apiEndpoint,
  app,
}: {
  slug: string;
  apiEndpoint: string;
  app: string;
}) {
  const adapter = useMemo(
    () => makeAdapter(() => slug, apiEndpoint, app),
    [slug, apiEndpoint, app],
  );
  const runtime = useLocalRuntime(adapter);
  const summary = useSummary(slug, apiEndpoint, app);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="flex-1 flex flex-col min-h-0">
        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 py-4">
          <SummarySection summary={summary} app={app} />
          <ThreadPrimitive.Messages
            components={{ UserMessage, AssistantMessage }}
          />
          <ThreadPrimitive.If running>
            <TypingIndicator />
          </ThreadPrimitive.If>
        </ThreadPrimitive.Viewport>
        <div className="px-3 py-3 border-t border-zinc-100">
          <Composer />
        </div>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary + question chips                                           */
/* ------------------------------------------------------------------ */

function SummarySection({
  summary,
  app,
}: {
  summary: SummaryData;
  app: string;
}) {
  if (summary.loading) {
    return (
      <div className="mb-4 space-y-2 animate-pulse">
        <div className="h-3 bg-zinc-100 rounded w-3/4" />
        <div className="h-3 bg-zinc-100 rounded w-full" />
        <div className="h-3 bg-zinc-100 rounded w-5/6" />
        <div className="mt-3 h-8 bg-zinc-50 rounded w-full" />
        <div className="h-8 bg-zinc-50 rounded w-full" />
        <div className="h-8 bg-zinc-50 rounded w-full" />
      </div>
    );
  }

  if (!summary.text) return null;

  return (
    <div className="mb-4 space-y-3">
      <div className="rounded-lg px-3 py-2.5 bg-zinc-50 border border-zinc-100 text-[13px] text-zinc-900 font-mono leading-relaxed whitespace-pre-wrap">
        {summary.text}
      </div>
      {summary.questions.length > 0 && (
        <QuestionChips
          questions={summary.questions}
          slug={summary.slug}
          app={app}
        />
      )}
    </div>
  );
}

function QuestionChips({
  questions,
  slug,
  app,
}: {
  questions: string[];
  slug: string;
  app: string;
}) {
  const threadRuntime = useThreadRuntime();

  const send = useCallback(
    (q: string, index: number) => {
      capture("guide_chat_question_chip_clicked", {
        app,
        slug,
        question: q,
        chip_index: index,
        question_count: questions.length,
      });
      threadRuntime.append({
        role: "user",
        content: [{ type: "text" as const, text: q }],
      });
    },
    [threadRuntime, slug, app, questions.length],
  );

  return (
    <div className="space-y-1.5">
      {questions.map((q, i) => (
        <button
          key={i}
          onClick={() => send(q, i)}
          className="w-full text-left px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:border-teal-300 hover:text-teal-700 transition-colors text-[12px] font-mono text-zinc-600 leading-snug"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat primitives                                                    */
/* ------------------------------------------------------------------ */

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mb-3 flex justify-end">
      <div className="max-w-[85%] rounded-lg px-3 py-2 bg-teal-50 border border-teal-100 text-[13px] text-zinc-900 font-mono whitespace-pre-wrap">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="mb-3 flex justify-start">
      <div className="max-w-[90%] rounded-lg px-3 py-2 bg-zinc-50 border border-zinc-100 text-[13px] text-zinc-900 font-mono leading-relaxed whitespace-pre-wrap">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function TypingIndicator() {
  return (
    <div className="mb-3 flex justify-start">
      <div className="rounded-lg px-3 py-2 bg-zinc-50 border border-zinc-100 text-[13px] text-zinc-400 font-mono">
        <span className="inline-flex gap-1">
          <span className="w-1 h-1 bg-zinc-400 rounded-full animate-pulse" />
          <span className="w-1 h-1 bg-zinc-400 rounded-full animate-pulse [animation-delay:150ms]" />
          <span className="w-1 h-1 bg-zinc-400 rounded-full animate-pulse [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="flex items-end gap-2 rounded-lg border border-zinc-200 bg-white focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-500/20 transition">
      <ComposerPrimitive.Input
        placeholder="ask a question..."
        className="flex-1 bg-transparent px-3 py-2 text-[13px] font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none resize-none max-h-32"
        rows={1}
      />
      <ComposerPrimitive.Send
        className="m-1 p-1.5 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
        aria-label="Send"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}

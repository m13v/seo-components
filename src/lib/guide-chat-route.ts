import { NextRequest } from "next/server";
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationsTool,
  type Part,
} from "@google/generative-ai";
import {
  buildSystemPrompt,
  getGuideContext,
  buildGuideIndex,
} from "./guide-context";
import { discoverGuides } from "./discover-guides";
import { logAiUsage } from "./ai-usage";

const MODEL_ID = "gemini-flash-latest";
const MAX_TOOL_ROUNDS = 3;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const ipHits = new Map<string, number[]>();

function ratelimit(ip: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return { ok: false, remaining: 0 };
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return { ok: true, remaining: RATE_LIMIT_MAX - hits.length };
}

/* ------------------------------------------------------------------ */
/*  Tool declarations                                                  */
/* ------------------------------------------------------------------ */

function buildToolDeclarations(brand: string): FunctionDeclarationsTool[] {
  const getGuideContentDecl: FunctionDeclaration = {
    name: "get_guide_content",
    description: `Load the full text content of any guide page on the ${brand} site by its slug. Use this when the visitor asks about a topic covered in another guide, or when you need to cross-reference information.`,
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        slug: {
          type: SchemaType.STRING,
          description:
            "The guide slug (e.g. 'some-topic'). See the guide index in the system prompt for available slugs.",
        },
      },
      required: ["slug"],
    },
  };

  const searchGuidesDecl: FunctionDeclaration = {
    name: "search_guides",
    description:
      "Search across all guide pages for a keyword or topic. Returns matching guide titles and the sections that mention the query. Use this when you need to find which guide covers a specific topic.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "The search term or topic to find across guides.",
        },
      },
      required: ["query"],
    },
  };

  return [{ functionDeclarations: [getGuideContentDecl, searchGuidesDecl] }];
}

/* ------------------------------------------------------------------ */
/*  Tool execution                                                     */
/* ------------------------------------------------------------------ */

function executeGetGuideContent(
  args: { slug: string },
  contentDir: string,
): Record<string, unknown> {
  const ctx = getGuideContext(args.slug, contentDir);
  if (!ctx) {
    return {
      error: `Guide "${args.slug}" not found. Check the guide index for valid slugs.`,
    };
  }
  return {
    slug: ctx.slug,
    title: ctx.title,
    description: ctx.description,
    sections: ctx.sections.map((s) => s.title),
    content: ctx.body,
  };
}

function executeSearchGuides(
  args: { query: string },
  contentDir: string,
): Record<string, unknown> {
  const query = args.query.toLowerCase();
  const guides = discoverGuides(contentDir);
  const results: { slug: string; title: string; matchingSections: string[] }[] =
    [];

  for (const g of guides) {
    const titleMatch = g.title.toLowerCase().includes(query);
    const descMatch = g.description.toLowerCase().includes(query);
    const matchingSections = g.sections
      .filter((s) => s.title.toLowerCase().includes(query))
      .map((s) => s.title);

    if (titleMatch || descMatch || matchingSections.length > 0) {
      results.push({ slug: g.slug, title: g.title, matchingSections });
    }
  }

  if (results.length === 0) {
    return {
      results: [],
      message: `No guides found matching "${args.query}". Try a broader term.`,
    };
  }
  return { results };
}

function executeTool(
  name: string,
  args: Record<string, unknown>,
  contentDir: string,
): Record<string, unknown> {
  switch (name) {
    case "get_guide_content":
      return executeGetGuideContent(args as { slug: string }, contentDir);
    case "search_guides":
      return executeSearchGuides(args as { query: string }, contentDir);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/* ------------------------------------------------------------------ */
/*  Config & factory                                                   */
/* ------------------------------------------------------------------ */

export interface GuideChatConfig {
  /** App identifier for token accounting (e.g. "cyrano", "pieline") */
  app: string;
  /** Brand name shown in system prompt (e.g. "Cyrano", "PieLine") */
  brand: string;
  /** Short site description for system prompt context */
  siteDescription?: string;
  /** Path to content directory relative to project root. Defaults to "src/app/t" */
  contentDir?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function createGuideChatHandler(config: GuideChatConfig) {
  const {
    app,
    brand,
    siteDescription,
    contentDir: relDir,
  } = config;

  const contentDir = relDir
    ? `${process.cwd()}/${relDir}`
    : `${process.cwd()}/src/app/t`;

  return async function POST(req: NextRequest) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const rl = ratelimit(ip);
    if (!rl.ok) {
      return new Response(
        JSON.stringify({ error: "rate_limit_exceeded", retry_after_minutes: 60 }),
        { status: 429, headers: { "content-type": "application/json" } },
      );
    }

    let body: { messages?: ChatMessage[]; slug?: string; healthCheck?: boolean };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    if (body.healthCheck) {
      const hasKey = !!process.env.GEMINI_API_KEY;
      return new Response(
        JSON.stringify(
          hasKey ? { ok: true } : { ok: false, reason: "missing_gemini_key" },
        ),
        {
          status: hasKey ? 200 : 503,
          headers: { "content-type": "application/json" },
        },
      );
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const slug = typeof body.slug === "string" ? body.slug : "";

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "no_messages" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const ctx = slug ? getGuideContext(slug, contentDir) : null;
    const systemPrompt = ctx
      ? buildSystemPrompt({ ctx, brand, siteDescription, contentDir })
      : `You are an assistant for the ${brand} website. Help the user with general questions.\n\nAll guides on this site:\n${buildGuideIndex(contentDir)}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "missing_gemini_key" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const requestId = crypto.randomUUID();
    const tools = buildToolDeclarations(brand);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      systemInstruction: systemPrompt,
      tools,
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));
    const lastUser = messages[messages.length - 1];
    const chat = model.startChat({ history });

    let toolRounds = 0;
    let currentRequest: string | Part[] = lastUser.content;
    let finalText: string | null = null;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    while (toolRounds <= MAX_TOOL_ROUNDS) {
      let result;
      try {
        result = await chat.sendMessage(currentRequest);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[guide-chat:${app}] gemini error:`, msg);
        return new Response(
          JSON.stringify({ error: "gemini_failed", detail: msg }),
          { status: 502, headers: { "content-type": "application/json" } },
        );
      }

      const response = result.response;
      const fnCalls = response.functionCalls();

      if (!fnCalls || fnCalls.length === 0) {
        finalText = response.text();

        const usage = response.usageMetadata;
        const inputTokens = usage?.promptTokenCount ?? 0;
        const outputTokens = usage?.candidatesTokenCount ?? 0;
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;
        const totalTokens =
          usage?.totalTokenCount ?? inputTokens + outputTokens;

        logAiUsage({
          app,
          model: MODEL_ID,
          inputTokens,
          outputTokens,
          totalTokens,
          requestId,
          metadata: {
            feature: "guide-chat",
            slug: slug || null,
            ip,
            toolRounds,
          },
        }).catch((err) =>
          console.error(`[guide-chat:${app}] logAiUsage:`, err),
        );

        break;
      }

      const functionResponses: Part[] = fnCalls.map((fc) => ({
        functionResponse: {
          name: fc.name,
          response: executeTool(
            fc.name,
            fc.args as Record<string, unknown>,
            contentDir,
          ),
        },
      }));

      currentRequest = functionResponses;
      toolRounds++;
    }

    if (finalText === null) {
      return new Response(
        JSON.stringify({ error: "max_tool_rounds_exceeded" }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "delta", text: finalText }) + "\n",
          ),
        );
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "done",
              usage: {
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
              },
              requestId,
              toolRounds,
              model: MODEL_ID,
            }) + "\n",
          ),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
    });
  };
}

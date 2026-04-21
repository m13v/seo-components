export type RobotsRule = {
  userAgent: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
  crawlDelay?: number;
};

export type GenerateRobotsOptions = {
  /** Absolute base URL, no trailing slash (e.g. `https://fde10x.com`). Used to build the sitemap URL. */
  baseUrl: string;
  /**
   * Paths disallowed for the default `*` rule. Defaults to `["/api/"]`.
   * Pass an empty array to allow everything.
   */
  disallow?: string[];
  /**
   * Explicit AI crawler allowlist. Each user agent gets its own rule with
   * `allow: "/"` so operators (Google, Perplexity, etc.) can distinguish
   * this site as AI-opted-in. Defaults to the canonical 13-bot allowlist
   * used across every m13v property. Pass `[]` to disable.
   */
  aiAllowlist?: string[];
  /** Extra rules appended after the default + AI allowlist. */
  extraRules?: RobotsRule[];
  /**
   * Override the sitemap URL. Defaults to `${baseUrl}/sitemap.xml`. Pass an
   * array when you ship multiple sitemaps.
   */
  sitemap?: string | string[];
};

export type GeneratedRobots = {
  rules: RobotsRule[];
  sitemap: string | string[];
};

const DEFAULT_AI_ALLOWLIST = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "CCBot",
  "Google-Extended",
  "Bytespider",
  "cohere-ai",
  "Applebot",
  "Applebot-Extended",
];

const DEFAULT_DISALLOW = ["/api/"];

/**
 * Generate a Next.js `MetadataRoute.Robots` value with a default rule, an
 * AI-crawler allowlist, and a sitemap reference derived from `baseUrl`.
 *
 * ```ts
 * // src/app/robots.ts
 * import { generateRobots } from "@seo/components/server";
 *
 * export default function robots() {
 *   return generateRobots({ baseUrl: "https://fde10x.com" });
 * }
 * ```
 *
 * Pair with `generateSitemap()` in `src/app/sitemap.ts` — the two together
 * are the canonical SEO-infrastructure setup for a client site.
 */
export function generateRobots(opts: GenerateRobotsOptions): GeneratedRobots {
  const baseUrl = opts.baseUrl.replace(/\/+$/, "");
  const disallow = opts.disallow ?? DEFAULT_DISALLOW;
  const aiAllowlist = opts.aiAllowlist ?? DEFAULT_AI_ALLOWLIST;

  const defaultRule: RobotsRule = {
    userAgent: "*",
    allow: "/",
    ...(disallow.length > 0 ? { disallow } : {}),
  };

  const aiRules: RobotsRule[] = aiAllowlist.map((userAgent) => ({
    userAgent,
    allow: "/",
  }));

  const rules = [defaultRule, ...aiRules, ...(opts.extraRules ?? [])];
  const sitemap = opts.sitemap ?? `${baseUrl}/sitemap.xml`;

  return { rules, sitemap };
}

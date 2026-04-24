// Server-side utilities for page discovery, guide chat, token accounting.
// Import from "@seo/components/server" in API routes and server components only.

export { walkPages, groupByCategory, categoryLabel } from "./lib/walk-pages";
export type { PageEntry, PageSection, WalkPagesOptions } from "./lib/walk-pages";

export { generateSitemap } from "./lib/generate-sitemap";
export type {
  SitemapEntry,
  SitemapPriority,
  GenerateSitemapOptions,
} from "./lib/generate-sitemap";

export { generateRobots } from "./lib/generate-robots";
export type {
  RobotsRule,
  GenerateRobotsOptions,
  GeneratedRobots,
} from "./lib/generate-robots";

export { slugify } from "./lib/slugify";

export { createGuideChatHandler } from "./lib/guide-chat-route";
export type { GuideChatConfig } from "./lib/guide-chat-route";

export { logAiUsage, computeCostUsd } from "./lib/ai-usage";
export type { LogAiUsageArgs } from "./lib/ai-usage";

export { discoverGuides } from "./lib/discover-guides";
export type { GuideEntry } from "./lib/discover-guides";

export { getGuideContext, buildGuideIndex, buildSystemPrompt } from "./lib/guide-context";
export type { GuideContext, BuildSystemPromptOptions } from "./lib/guide-context";

export { getSupabaseAdmin } from "./lib/supabase-admin";

export { createNewsletterHandler } from "./lib/newsletter-route";
export type { NewsletterConfig } from "./lib/newsletter-route";

export { createBookCallHandler } from "./lib/book-call-route";
export type { BookCallConfig } from "./lib/book-call-route";

export { createBookCallRedirectHandler } from "./lib/book-call-redirect";
export type { BookCallRedirectConfig } from "./lib/book-call-redirect";

// SeoComponentsStyles was removed in v0.23.0. It injected a prebuilt Tailwind
// bundle wrapped in `@layer seo-components`, which collided with the
// consumer's own `@layer utilities` and forced GuideChatPanel / SitemapSidebar
// to `display: none`. Consumers should rely on their own Tailwind scanning
// the library via `@source "../../node_modules/@seo/components/src";` in
// globals.css instead. The prebuilt CSS file is still shipped for anyone
// who wants to `import "@m13v/seo-components/styles.css"` directly.

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

// Style injector — server-only component that inlines the prebuilt Tailwind
// CSS for the sidebar/chat/heading components as a <style> tag.
// Use in your root layout <head> to avoid consumer-side PostCSS conflicts.
export { SeoComponentsStyles } from "./components/SeoComponentsStyles";

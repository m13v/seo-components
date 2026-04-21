# @m13v/seo-components

42 animated React components for programmatic SEO pages. Ships as TypeScript source (no build step); Next.js transpiles it directly.

## Install

```bash
npm install @seo/components@npm:@m13v/seo-components
```

This aliases the package so you import from `@seo/components` everywhere.

## Usage

```tsx
// Client components
import { Breadcrumbs, ArticleMeta, FaqSection, ComparisonTable } from "@seo/components";
import { SitemapSidebar, GuideChatPanel, HeadingAnchors } from "@seo/components";
import { AnimatedBeam, MorphingText, NumberTicker, Particles } from "@seo/components";

// Server utilities (API routes, server components)
import { walkPages, createGuideChatHandler, discoverGuides } from "@seo/components/server";
```

## Components

### Trust & Content

| Component | What it does |
|-----------|-------------|
| `Breadcrumbs` | SEO breadcrumb trail with JSON-LD |
| `ArticleMeta` | Author, date, read time |
| `FaqSection` | Expandable FAQ with `FAQPage` schema |
| `ComparisonTable` | Feature comparison grid |
| `ProofBand` | Logo/stat proof strip |
| `ProofBanner` | Quote + metric banner |
| `InlineTestimonial` | Inline quote block |

### Animation (Magic UI style)

| Component | What it does |
|-----------|-------------|
| `AnimatedBeam` | SVG beam connecting elements |
| `MorphingText` | Text that morphs between strings |
| `NumberTicker` | Counting number animation |
| `OrbitingCircles` | Orbiting icon circles |
| `Particles` | Interactive particle field |
| `Marquee` | Infinite scroll marquee |
| `ShimmerButton` | Button with shimmer effect |
| `GradientText` | Animated gradient text |
| `TextShimmer` | Shimmering text highlight |
| `TypingAnimation` | Typewriter effect |
| `ShineBorder` | Animated border glow |
| `BackgroundGrid` | Dot/line grid background |

### Layout & Display

| Component | What it does |
|-----------|-------------|
| `BentoGrid` | Responsive bento card grid |
| `BeforeAfter` | Side-by-side before/after |
| `AnimatedDemo` | Animated product demo frame |
| `GlowCard` | Card with glow on hover |
| `ParallaxSection` | Parallax scroll section |
| `StepTimeline` | Numbered step timeline |
| `MotionSequence` | Sequenced entrance animations |
| `AnimatedSection` | Fade-in section wrapper |
| `AnimatedMetric` | Single animated stat |
| `MetricsRow` | Row of animated stats |

### Code & Technical

| Component | What it does |
|-----------|-------------|
| `AnimatedCodeBlock` | Syntax-highlighted code with line animations |
| `CodeComparison` | Side-by-side code diff |
| `TerminalOutput` | Terminal-style output |
| `FlowDiagram` | Animated flow chart |
| `SequenceDiagram` | Step sequence diagram |
| `AnimatedChecklist` | Animated checkbox list |

### CTA

| Component | What it does |
|-----------|-------------|
| `InlineCta` | Inline call-to-action block |
| `StickyBottomCta` | Fixed bottom CTA bar |

### Interactive

| Component | What it does |
|-----------|-------------|
| `SitemapSidebar` | Universal sidebar with search, page discovery, subsection tracking |
| `HeadingAnchors` | Auto-injects `id` on H2s for sidebar linking |
| `GuideChatPanel` | AI page assistant with Gemini streaming (NDJSON) |

### Video

| Component | What it does |
|-----------|-------------|
| `RemotionClip` | Remotion video player embed |
| `LottiePlayer` | Lottie animation player |

## Server Utilities

```tsx
import { walkPages, createGuideChatHandler, logAiUsage } from "@seo/components/server";
```

| Export | What it does |
|--------|-------------|
| `walkPages()` | Discovers all pages in `src/app/`, extracts titles, descriptions, H2 sections |
| `generateSitemap()` | Returns a `MetadataRoute.Sitemap` by walking `src/app` with priority tiers |
| `generateRobots()` | Returns a `MetadataRoute.Robots` with default + AI-crawler allowlist + sitemap URL |
| `createGuideChatHandler()` | Gemini streaming chat route handler |
| `discoverGuides()` | Legacy guide discovery (delegates to `walkPages`) |
| `getGuideContext()` | Builds page context for AI chat |
| `logAiUsage()` | Token usage tracking |
| `getSupabaseAdmin()` | Supabase admin client |
| `slugify()` | URL-safe slug utility |

### Sitemap + robots (canonical setup)

Every site should ship a **dynamic** sitemap and a robots.txt that references it. The library provides both as one-liners so you never hand-roll either again.

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { generateSitemap } from "@seo/components/server";

export default function sitemap(): MetadataRoute.Sitemap {
  return generateSitemap({ baseUrl: "https://yourdomain.com" });
}
```

```ts
// src/app/robots.ts
import type { MetadataRoute } from "next";
import { generateRobots } from "@seo/components/server";

export default function robots(): MetadataRoute.Robots {
  return generateRobots({ baseUrl: "https://yourdomain.com" });
}
```

`generateSitemap()` walks `src/app/` for `page.tsx` files (skipping route groups, dynamic segments, `api/`, underscore-prefixed dirs) and applies priority tiers. For dynamic routes like `/blog/[slug]`, pass `extraEntries`:

```ts
return generateSitemap({
  baseUrl: "https://yourdomain.com",
  extraEntries: posts.map((p) => ({ url: `https://yourdomain.com/blog/${p.slug}` })),
});
```

`generateRobots()` emits the default `User-agent: *` rule, a 13-bot AI allowlist (GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, CCBot, Google-Extended, Bytespider, cohere-ai, Applebot, Applebot-Extended), and a sitemap URL derived from `baseUrl`. Override `aiAllowlist`, `disallow`, `extraRules`, or `sitemap` as needed.

Verify live after deploy:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.com/sitemap.xml  # 200
curl -s https://yourdomain.com/robots.txt | grep sitemap.xml                 # non-empty
```

## JSON-LD Helpers

```tsx
import { breadcrumbListSchema, faqPageSchema, articleSchema, howToSchema } from "@seo/components";
```

## Theming

Components use CSS variables for brand colors. Override in your `globals.css`:

```css
:root {
  --seo-accent: #0d9488;       /* teal-600 default */
  --seo-accent-light: #ccfbf1; /* teal-100 */
  --seo-accent-dark: #134e4a;  /* teal-900 */
}
```

## Peer Dependencies

Required: `next >= 14`, `react >= 18`, `framer-motion >= 11`

Optional: `remotion`, `@remotion/player`, `lottie-react`, `@google/generative-ai`, `posthog-js`

## License

MIT

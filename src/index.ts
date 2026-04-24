// JSON-LD structured data helpers
export {
  breadcrumbListSchema,
  faqPageSchema,
  articleSchema,
  howToSchema,
} from "./lib/json-ld";
export type {
  BreadcrumbItem,
  FaqItem,
  ArticleSchemaInput,
  HowToStepInput,
} from "./lib/json-ld";

// Trust-signal components
export { Breadcrumbs } from "./components/Breadcrumbs";
export type { BreadcrumbCrumb } from "./components/Breadcrumbs";
export { ArticleMeta } from "./components/ArticleMeta";
export { ProofBand } from "./components/ProofBand";
export { FaqSection } from "./components/FaqSection";
export { InlineTestimonial } from "./components/InlineTestimonial";
export { ComparisonTable } from "./components/ComparisonTable";
export type { ComparisonRow } from "./components/ComparisonTable";

// Content display components
export { AnimatedCodeBlock } from "./components/AnimatedCodeBlock";
export { TerminalOutput } from "./components/TerminalOutput";
export { FlowDiagram } from "./components/FlowDiagram";
export { SequenceDiagram } from "./components/SequenceDiagram";
export { CodeComparison } from "./components/CodeComparison";
export { AnimatedChecklist } from "./components/AnimatedChecklist";
export { AnimatedSection } from "./components/AnimatedSection";
export { AnimatedMetric } from "./components/AnimatedMetric";
export { MetricsRow } from "./components/MetricsRow";

// CTA components
export { InlineCta } from "./components/InlineCta";
export { StickyBottomCta } from "./components/StickyBottomCta";
export { ClaudeMeterCta } from "./components/ClaudeMeterCta";
export type { ClaudeMeterCtaProps } from "./components/ClaudeMeterCta";
export { BookCallCTA } from "./components/BookCallCTA";
export type {
  BookCallCTAProps,
  BookCallAppearance,
} from "./components/BookCallCTA";
export {
  GetStartedCTA,
  // Deprecated aliases — re-exported so existing callers keep compiling.
  DownloadCTA,
} from "./components/GetStartedCTA";
export type {
  GetStartedCTAProps,
  GetStartedCTAAppearance,
  DownloadCTAProps,
  DownloadCTAAppearance,
} from "./components/GetStartedCTA";

// Canonical analytics helpers.
// `get_started_click` covers every primary self-serve CTA: downloads,
// installs, and signups. `schedule_click` covers sales-led book-a-call
// CTAs. `trackDownloadClick` is a deprecated alias that emits
// `get_started_click` (not `download_click`).
export {
  trackScheduleClick,
  trackGetStartedClick,
  trackDownloadClick,
  trackCrossProductClick,
  withBookingAttribution,
  identifyBookCallLead,
} from "./lib/track";
export type {
  ScheduleClickProps,
  GetStartedClickProps,
  DownloadClickProps,
  CrossProductClickProps,
} from "./lib/track";

// Analytics context: provider + hooks so library components fire PostHog
// events reliably regardless of how the consumer loads posthog-js.
export {
  SeoAnalyticsProvider,
  useCapture,
  captureFromWindow,
} from "./lib/analytics-context";
export type {
  PostHogLike,
  SeoAnalyticsProviderProps,
} from "./lib/analytics-context";

// All-in-one analytics wiring for consumer sites.
export { FullSiteAnalytics } from "./components/FullSiteAnalytics";
export type { FullSiteAnalyticsProps } from "./components/FullSiteAnalytics";

// Proof / social proof
export { ProofBanner } from "./components/ProofBanner";

// Rich layout components
export { BentoGrid } from "./components/BentoGrid";
export type { BentoCard } from "./components/BentoGrid";
export { BeforeAfter } from "./components/BeforeAfter";
export { AnimatedDemo } from "./components/AnimatedDemo";
export { GlowCard } from "./components/GlowCard";
export { ParallaxSection } from "./components/ParallaxSection";
export { StepTimeline } from "./components/StepTimeline";
export { MotionSequence } from "./components/MotionSequence";
export { HorizontalStepper } from "./components/HorizontalStepper";
export type { StepperStep } from "./components/HorizontalStepper";
export { Team } from "./components/Team";
export type { TeamMember } from "./components/Team";
export { IntegrationsGrid } from "./components/IntegrationsGrid";
export type { IntegrationItem } from "./components/IntegrationsGrid";
export { RelatedPostsGrid } from "./components/RelatedPostsGrid";
export type { RelatedPost } from "./components/RelatedPostsGrid";

// Remotion video + Lottie
export { RemotionClip, ConceptReveal } from "./components/RemotionClip";
export { LottiePlayer } from "./components/LottiePlayer";

// Sitemap sidebar + heading anchors + HTML sitemap page
export { SitemapSidebar } from "./components/SitemapSidebar";
export type { SitemapSidebarProps } from "./components/SitemapSidebar";
export { HeadingAnchors } from "./components/HeadingAnchors";
export { HtmlSitemap } from "./components/HtmlSitemap";
export type { HtmlSitemapProps } from "./components/HtmlSitemap";

// Guide chat (AI page assistant) — client-safe
export { GuideChatPanel } from "./components/GuideChatPanel";
export type { GuideChatPanelProps } from "./components/GuideChatPanel";

// Newsletter signup (sticky footer email capture)
export { NewsletterSignup } from "./components/NewsletterSignup";
export type { NewsletterSignupProps } from "./components/NewsletterSignup";

// SEO page comments + reactions (public, anonymous, no signup)
export { SeoPageComments } from "./components/SeoPageComments";
export type { SeoPageCommentsProps } from "./components/SeoPageComments";
export { SeoPageReactions } from "./components/SeoPageReactions";
export type { SeoPageReactionsProps } from "./components/SeoPageReactions";

// Server utilities: import from "@seo/components/server" instead
// (walkPages, createGuideChatHandler, logAiUsage, discoverGuides, etc.)

// Magic UI style components
export { Marquee } from "./components/Marquee";
export { AnimatedBeam } from "./components/AnimatedBeam";
export { OrbitingCircles } from "./components/OrbitingCircles";
export { NumberTicker } from "./components/NumberTicker";
export { ShimmerButton } from "./components/ShimmerButton";
export { GradientText } from "./components/GradientText";
export { BackgroundGrid } from "./components/BackgroundGrid";
export { MorphingText } from "./components/MorphingText";
export { Particles } from "./components/Particles";
export { ShineBorder } from "./components/ShineBorder";
export { TextShimmer } from "./components/TextShimmer";
export { TypingAnimation } from "./components/TypingAnimation";

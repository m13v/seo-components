import fs from "node:fs";
import path from "node:path";
import { discoverGuides, type GuideEntry } from "./discover-guides";

export interface GuideContext {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  sections: { id: string; title: string }[];
  body: string;
}

export function getGuideContext(
  slug: string,
  contentDir?: string,
): GuideContext | null {
  const dir = contentDir ?? path.join(process.cwd(), "src/app/(content)/t");
  const guides = discoverGuides(dir);
  // Match by last-segment slug or full href path (e.g. "solutions/sap" -> "/solutions/sap")
  const hrefFromSlug = "/" + slug;
  const guide = guides.find(
    (g) => g.slug === slug || g.href === hrefFromSlug,
  );
  if (!guide) return null;

  // Resolve the page file on disk. `guide.href` is a URL path, which has
  // Next.js route-group segments like `(content)` stripped out, so we cannot
  // just join `appDir + href`. Instead, compute the URL prefix that `dir`
  // maps to, strip it from `href`, and append the remainder to `dir` (the
  // real filesystem path the caller passed in).
  const relDir = path.relative(process.cwd(), dir);
  const relParts = relDir.split(path.sep);
  const appIdx = relParts.indexOf("app");
  const appDir =
    appIdx >= 0
      ? path.join(process.cwd(), ...relParts.slice(0, appIdx + 1))
      : dir;
  const relContent = path.relative(appDir, dir);
  const urlSegments = relContent
    ? relContent
        .split(path.sep)
        .filter((s) => !(s.startsWith("(") && s.endsWith(")")))
    : [];
  const urlPrefix = urlSegments.length ? "/" + urlSegments.join("/") : "";
  let relHref = guide.href;
  if (urlPrefix && relHref.startsWith(urlPrefix + "/")) {
    relHref = relHref.slice(urlPrefix.length + 1);
  } else if (relHref.startsWith("/")) {
    relHref = relHref.slice(1);
  }
  const pagePath = path.join(dir, relHref, "page.tsx");
  let rawSource = "";
  try {
    rawSource = fs.readFileSync(pagePath, "utf-8");
  } catch {
    return null;
  }

  const body = extractReadableText(rawSource).slice(0, 12_000);
  return {
    slug: guide.slug,
    title: guide.title,
    description: guide.description,
    datePublished: guide.datePublished,
    sections: guide.sections,
    body,
  };
}

function extractReadableText(src: string): string {
  const lines = src.split("\n");
  const out: string[] = [];
  let depth = 0;
  let inReturn = false;
  for (const line of lines) {
    if (!inReturn && /return\s*\(/.test(line)) {
      inReturn = true;
    }
    if (!inReturn) continue;
    depth += (line.match(/\(/g) || []).length;
    depth -= (line.match(/\)/g) || []).length;
    out.push(line);
    if (inReturn && depth <= 0) break;
  }
  const jsx = out.join("\n");
  return jsx
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildGuideIndex(contentDir?: string): string {
  const guides = discoverGuides(contentDir);
  if (guides.length === 0) return "No guides available.";
  return guides
    .map((g) => {
      const sections = g.sections.map((s) => s.title).join(", ");
      return `- slug: "${g.slug}" | title: "${g.title}" | sections: [${sections}]`;
    })
    .join("\n");
}

export interface BuildSystemPromptOptions {
  ctx: GuideContext;
  brand: string;
  siteDescription?: string;
  contentDir?: string;
}

export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  const { ctx, brand, siteDescription, contentDir } = opts;
  const sectionList = ctx.sections.map((s) => `- ${s.title}`).join("\n");
  const guideIndex = buildGuideIndex(contentDir);

  return [
    `You are an assistant embedded in the ${brand} website.`,
    siteDescription ? `Site context: ${siteDescription}` : "",
    "The visitor is reading a specific article (guide page). Your job is to help them understand the article they are reading.",
    "",
    "IMPORTANT: When summarizing or answering, focus on what the ARTICLE covers and what the reader will learn from it. Do NOT just describe the product. Describe the article's content, structure, and key takeaways.",
    "",
    "Ground answers in the provided page content. If the question is outside the page, use the get_guide_content tool to look up other pages, or say so briefly and answer from general knowledge.",
    "Keep answers concise and use plain text. No markdown headings. Inline code is fine.",
    "",
    `CURRENT ARTICLE: "${ctx.title}"`,
    `Slug: ${ctx.slug}`,
    ctx.description ? `Description: ${ctx.description}` : "",
    "",
    "Sections in this article:",
    sectionList,
    "",
    "Article content (trimmed):",
    ctx.body,
    "",
    "ALL GUIDES ON THIS SITE (use get_guide_content tool to read any of them):",
    guideIndex,
  ]
    .filter(Boolean)
    .join("\n");
}

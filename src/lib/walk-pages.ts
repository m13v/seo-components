import fs from "node:fs";
import path from "node:path";
import { slugify } from "./slugify";
import type { PageEntry, PageSection } from "./page-entry";
export { groupByCategory, categoryLabel } from "./page-entry";
export type { PageEntry, PageSection } from "./page-entry";

export interface WalkPagesOptions {
  /** Absolute path to src/app directory. Defaults to `process.cwd()/src/app`. */
  appDir?: string;
  /** Filter out specific path segments (e.g. ["checkout", "trial-required"]). */
  excludePaths?: string[];
  /** If true, include the home page (href "/"). Default: false. */
  includeHome?: boolean;
}

// Metadata patterns: `const TITLE = "..."` style
const CONST_TITLE_RE = /const\s+TITLE\s*=\s*["'`](.+?)["'`]/;
const CONST_DESC_RE = /const\s+DESCRIPTION\s*=\s*\n?\s*["'`](.+?)["'`]/;
const CONST_DATE_RE = /const\s+DATE_PUBLISHED\s*=\s*["'`](.+?)["'`]/;

// Metadata patterns: `export const metadata = { title: "..." }` style
const META_TITLE_RE = /title:\s*["'`](.+?)["'`]/;
const META_DESC_RE = /description:\s*["'`](.+?)["'`]/;

const H2_RE = /<h2\b[^>]*>([\s\S]*?)<\/h2>/g;
const FAQ_SECTION_RE = /<FaqSection\b/;

const ENTITY_MAP: Record<string, string> = {
  "&ldquo;": "\u201c",
  "&rdquo;": "\u201d",
  "&lsquo;": "\u2018",
  "&rsquo;": "\u2019",
  "&apos;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&mdash;": ",",
  "&ndash;": ",",
  "&hellip;": "...",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, n) => String.fromCharCode(parseInt(n, 16)),
    )
    .replace(/&[a-z]+;/gi, (m) => ENTITY_MAP[m.toLowerCase()] ?? m);
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractSections(src: string): PageSection[] {
  const seen = new Set<string>();
  const out: PageSection[] = [];
  let m: RegExpExecArray | null;
  H2_RE.lastIndex = 0;
  while ((m = H2_RE.exec(src)) !== null) {
    const raw = m[1];
    const text = decodeEntities(
      raw
        .replace(/\{[^}]*\}/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    ).trim();
    if (!text) continue;
    const base = slugify(text);
    if (!base) continue;
    let id = base;
    let i = 2;
    while (seen.has(id)) {
      id = `${base}-${i++}`;
    }
    seen.add(id);
    out.push({ id, title: text });
  }
  if (FAQ_SECTION_RE.test(src)) {
    const faqTitle = "Frequently asked questions";
    const faqId = slugify(faqTitle);
    if (!seen.has(faqId)) {
      out.push({ id: faqId, title: faqTitle });
    }
  }
  return out;
}

function extractMetadata(src: string, fallbackSlug: string) {
  // Try const TITLE first, fall back to metadata.title
  const title =
    src.match(CONST_TITLE_RE)?.[1] ??
    src.match(META_TITLE_RE)?.[1] ??
    slugToTitle(fallbackSlug);
  const description =
    src.match(CONST_DESC_RE)?.[1] ?? src.match(META_DESC_RE)?.[1] ?? "";
  const datePublished = src.match(CONST_DATE_RE)?.[1];

  return {
    title: decodeEntities(title),
    description: decodeEntities(description),
    datePublished,
  };
}

/**
 * Recursively discovers all page.tsx files under a Next.js app directory.
 * Same logic as the sitemap.ts walkPages() that already exists on every site,
 * but enriched with title, description, sections, and category.
 *
 * Import from "@seo/components/server".
 */
export function walkPages(opts?: WalkPagesOptions): PageEntry[] {
  const appDir =
    opts?.appDir ?? path.join(process.cwd(), "src/app");
  const excludeSet = new Set(opts?.excludePaths ?? []);

  const pages: PageEntry[] = [];

  function walk(dir: string, urlSegments: string[]) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isFile() && entry.name === "page.tsx") {
        const href =
          urlSegments.length === 0 ? "/" : "/" + urlSegments.join("/");

        // Skip home page unless requested
        if (href === "/" && !opts?.includeHome) continue;

        const filePath = path.join(dir, entry.name);
        let src: string;
        try {
          src = fs.readFileSync(filePath, "utf-8");
        } catch {
          continue;
        }

        const lastSegment = urlSegments[urlSegments.length - 1] ?? "";
        const meta = extractMetadata(src, lastSegment);
        const sections = extractSections(src);
        const category = urlSegments[0] ?? "";

        pages.push({
          href,
          title: meta.title,
          description: meta.description,
          datePublished: meta.datePublished,
          sections,
          category,
        });
        continue;
      }

      if (!entry.isDirectory()) continue;

      const name = entry.name;
      if (name.startsWith("_")) continue;
      if (name === "api") continue;
      if (name.startsWith("[") && name.endsWith("]")) continue;
      if (excludeSet.has(name)) continue;

      const isRouteGroup = name.startsWith("(") && name.endsWith(")");
      const nextSegments = isRouteGroup
        ? urlSegments
        : [...urlSegments, name];

      walk(path.join(dir, name), nextSegments);
    }
  }

  walk(appDir, []);

  // Sort: pages with dates descending, then alphabetically by title
  pages.sort(
    (a, b) =>
      (b.datePublished ?? "").localeCompare(a.datePublished ?? "") ||
      a.title.localeCompare(b.title),
  );

  return pages;
}


import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, sep, relative } from "node:path";

/**
 * Wrap a Next.js config so the guide-chat API route can read content files
 * at runtime on Vercel. Does two things:
 *
 * 1. Walks `contentDir` at config evaluation time (during `next build`) and
 *    writes a JSON manifest of all discovered pages to
 *    `.next/seo-guides-manifest.json`. The serverless function reads this
 *    manifest instead of walking the filesystem at runtime.
 *
 * 2. Adds `outputFileTracingIncludes` so Next.js bundles every page.tsx
 *    under `contentDir` into the guide-chat serverless function (needed for
 *    reading article text at runtime).
 *
 * Usage (next.config.ts or next.config.mjs):
 *
 *   import { withSeoContent } from "@m13v/seo-components/next";
 *   const nextConfig = { ... };
 *   export default withSeoContent(nextConfig, { contentDir: "src/app/t" });
 *
 * @param {import('next').NextConfig} [config]
 * @param {{ contentDir?: string }} [opts]
 * @returns {import('next').NextConfig}
 */
export function withSeoContent(config = {}, opts = {}) {
  const contentDir = opts.contentDir ?? "src/app/t";
  const contentGlob = `./${contentDir}/**/*`;
  const existing = config.outputFileTracingIncludes ?? {};

  // Build a manifest at config evaluation time (runs during `next build`).
  // Write to project root so outputFileTracingIncludes can find it reliably.
  const manifestFile = "seo-guides-manifest.json";
  try {
    const manifest = buildManifest(contentDir);
    writeFileSync(join(process.cwd(), manifestFile), JSON.stringify(manifest));
  } catch (e) {
    // Non-fatal: the runtime will fall back to filesystem walking
  }

  return {
    ...config,
    outputFileTracingIncludes: {
      ...existing,
      "/api/guide-chat": [contentGlob, `./${manifestFile}`],
      "/api/guide-chat/route": [contentGlob, `./${manifestFile}`],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Build-time manifest generation (mirrors walk-pages.ts logic)       */
/* ------------------------------------------------------------------ */

const CONST_TITLE_RE = /const\s+TITLE\s*=\s*["'`](.+?)["'`]/;
const CONST_DESC_RE = /const\s+DESCRIPTION\s*=\s*\n?\s*["'`](.+?)["'`]/;
const CONST_DATE_RE = /const\s+DATE_PUBLISHED\s*=\s*["'`](.+?)["'`]/;
const META_TITLE_RE = /title:\s*["'`](.+?)["'`]/;
const META_DESC_RE = /description:\s*["'`](.+?)["'`]/;
const H2_RE = /<h2\b[^>]*>([\s\S]*?)<\/h2>/g;
const FAQ_SECTION_RE = /<FaqSection\b/;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extractMeta(src, fallbackSlug) {
  const title =
    src.match(CONST_TITLE_RE)?.[1] ??
    src.match(META_TITLE_RE)?.[1] ??
    fallbackSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const description =
    src.match(CONST_DESC_RE)?.[1] ?? src.match(META_DESC_RE)?.[1] ?? "";
  const datePublished = src.match(CONST_DATE_RE)?.[1] ?? undefined;
  return { title, description, datePublished };
}

function extractSections(src) {
  const seen = new Set();
  const out = [];
  let m;
  H2_RE.lastIndex = 0;
  while ((m = H2_RE.exec(src)) !== null) {
    const text = m[1]
      .replace(/\{[^}]*\}/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    const base = slugify(text);
    if (!base) continue;
    let id = base;
    let i = 2;
    while (seen.has(id)) { id = `${base}-${i++}`; }
    seen.add(id);
    out.push({ id, title: text });
  }
  if (FAQ_SECTION_RE.test(src)) {
    const faqId = "frequently-asked-questions";
    if (!seen.has(faqId)) out.push({ id: faqId, title: "Frequently asked questions" });
  }
  return out;
}

function buildManifest(contentDir) {
  const cwd = process.cwd();
  const relParts = contentDir.split(/[/\\]/);
  const appIdx = relParts.indexOf("app");
  const appDirRel = appIdx >= 0 ? relParts.slice(0, appIdx + 1).join(sep) : contentDir;
  const appDir = join(cwd, appDirRel);
  const contentAbs = join(cwd, contentDir);

  const pages = [];

  function walk(dir, urlSegments) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (entry.isFile() && entry.name === "page.tsx") {
        const href = urlSegments.length === 0 ? "/" : "/" + urlSegments.join("/");
        if (href === "/") continue;
        const filePath = join(dir, entry.name);
        let src;
        try { src = readFileSync(filePath, "utf-8"); }
        catch { continue; }
        const lastSeg = urlSegments[urlSegments.length - 1] ?? "";
        const meta = extractMeta(src, lastSeg);
        const sections = extractSections(src);
        pages.push({
          href,
          title: meta.title,
          description: meta.description,
          datePublished: meta.datePublished,
          sections,
          category: urlSegments[0] ?? "",
        });
        continue;
      }
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (name.startsWith("_") || name === "api" || (name.startsWith("[") && name.endsWith("]"))) continue;
      const isRouteGroup = name.startsWith("(") && name.endsWith(")");
      walk(join(dir, name), isRouteGroup ? urlSegments : [...urlSegments, name]);
    }
  }

  walk(appDir, []);

  // Filter to contentDir prefix
  const relContent = relative(appDir, contentAbs);
  const segments = relContent
    ? relContent.split(sep).filter(s => !(s.startsWith("(") && s.endsWith(")")))
    : [];
  const hrefPrefix = "/" + segments.join("/");

  const filterPrefix = hrefPrefix === "/" ? "/" : hrefPrefix + "/";
  const filtered = pages.filter(p =>
    p.href.startsWith(filterPrefix) && p.href !== hrefPrefix
  );

  filtered.sort((a, b) =>
    (b.datePublished ?? "").localeCompare(a.datePublished ?? "") || a.title.localeCompare(b.title)
  );

  return { contentDir, appDir: appDirRel, pages: filtered };
}

import path from "node:path";
import { walkPages, type PageEntry } from "./walk-pages";

export interface GuideEntry {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  href: string;
  sections: { id: string; title: string }[];
  hasFaq: boolean;
}

let cachedDir: string | null = null;
let cachedGuides: GuideEntry[] | null = null;

/**
 * Legacy helper that discovers guides under a specific content directory.
 * Internally delegates to walkPages() then filters to the relevant path prefix.
 *
 * For new integrations, prefer walkPages() directly.
 */
export function discoverGuides(contentDir?: string): GuideEntry[] {
  const dir = contentDir ?? path.join(process.cwd(), "src/app/(content)/t");

  if (cachedDir === dir && cachedGuides) return cachedGuides;

  // Determine which URL prefix these pages live under by
  // finding the path segments after src/app (skipping route groups).
  const appDir = path.join(process.cwd(), "src/app");
  const allPages = walkPages({ appDir });

  // Figure out the href prefix from contentDir.
  // e.g. "src/app/(content)/t" -> "/t", "src/app/t" -> "/t"
  const relative = path.relative(appDir, dir);
  const segments = relative
    .split(path.sep)
    .filter((s) => !s.startsWith("(") || !s.endsWith(")"));
  const hrefPrefix = "/" + segments.join("/");

  const guides: GuideEntry[] = allPages
    .filter((p) => p.href.startsWith(hrefPrefix + "/") || p.href === hrefPrefix)
    .filter((p) => p.href !== hrefPrefix) // exclude the index page
    .map(pageToGuide);

  guides.sort(
    (a, b) =>
      (b.datePublished || "").localeCompare(a.datePublished || "") ||
      a.title.localeCompare(b.title),
  );

  cachedDir = dir;
  cachedGuides = guides;
  return guides;
}

function pageToGuide(p: PageEntry): GuideEntry {
  const parts = p.href.split("/");
  const slug = parts[parts.length - 1] || "";
  return {
    slug,
    title: p.title,
    description: p.description,
    datePublished: p.datePublished ?? "",
    href: p.href,
    sections: p.sections,
    hasFaq: p.sections.some(
      (s) => s.id === "frequently-asked-questions",
    ),
  };
}

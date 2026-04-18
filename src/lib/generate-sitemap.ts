import fs from "node:fs";
import path from "node:path";

export type SitemapPriority = {
  path: RegExp | string;
  priority: number;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
};

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: SitemapPriority["changeFrequency"];
  priority?: number;
};

export type GenerateSitemapOptions = {
  /** Absolute base URL, no trailing slash (e.g. `https://fde10x.com`). */
  baseUrl: string;
  /** Absolute path to Next.js `src/app`. Defaults to `process.cwd() + "/src/app"`. */
  appDir?: string;
  /**
   * Priority/changeFrequency tiers applied by regex match on the URL path.
   * First match wins. If no rules match, defaults kick in (home=1.0,
   * everything else=0.7, weekly). Pass `priorities: []` to disable defaults.
   */
  priorities?: SitemapPriority[];
  /**
   * Extra entries appended after the filesystem walk. Use for dynamic routes
   * like /blog/[slug] where the filesystem doesn't know the concrete URLs.
   */
  extraEntries?: SitemapEntry[];
  /** Path segments to skip entirely during the walk (e.g. ["checkout"]). */
  excludePaths?: string[];
};

const DEFAULT_PRIORITIES: SitemapPriority[] = [
  { path: /^\/$/, priority: 1.0, changeFrequency: "weekly" },
  {
    path: /^\/(how-it-works|wins|book|contact|pricing)(\/|$)/,
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: /^\/(about|faq|blog|podcast|testimonials|case-studies)(\/|$)/,
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: /^\/(guides|trainings|tools|resources|t)(\/|$)/,
    priority: 0.6,
    changeFrequency: "weekly",
  },
  {
    path: /^\/(privacy|terms|legal|cookies)(\/|$)/,
    priority: 0.3,
    changeFrequency: "yearly",
  },
];

function matchPriority(
  urlPath: string,
  rules: SitemapPriority[],
): { priority: number; changeFrequency: SitemapPriority["changeFrequency"] } {
  for (const rule of rules) {
    const matched =
      typeof rule.path === "string"
        ? urlPath === rule.path
        : rule.path.test(urlPath);
    if (matched) {
      return {
        priority: rule.priority,
        changeFrequency: rule.changeFrequency ?? "weekly",
      };
    }
  }
  return { priority: 0.7, changeFrequency: "weekly" };
}

function walkFilesystemPages(
  appDir: string,
  baseUrl: string,
  excludeSet: Set<string>,
): SitemapEntry[] {
  const results: SitemapEntry[] = [];

  function walk(dir: string, urlSegments: string[]) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isFile() && entry.name === "page.tsx") {
        const filePath = path.join(dir, entry.name);
        let stat: fs.Stats;
        try {
          stat = fs.statSync(filePath);
        } catch {
          continue;
        }
        const urlPath =
          urlSegments.length === 0 ? "" : "/" + urlSegments.join("/");
        results.push({
          url: `${baseUrl}${urlPath}`,
          lastModified: stat.mtime,
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
  return results;
}

/**
 * Generate a Next.js `MetadataRoute.Sitemap` by walking `src/app` for
 * `page.tsx` files and applying priority tiers. Route groups (parentheses),
 * dynamic segments (brackets), underscore-prefixed dirs, and `api/` are
 * excluded automatically.
 *
 * ```ts
 * // src/app/sitemap.ts
 * import { generateSitemap } from "@seo/components/server";
 *
 * export default function sitemap() {
 *   return generateSitemap({ baseUrl: "https://fde10x.com" });
 * }
 * ```
 *
 * For dynamic routes (blog, tags), append via `extraEntries`.
 */
export function generateSitemap(
  opts: GenerateSitemapOptions,
): SitemapEntry[] {
  const baseUrl = opts.baseUrl.replace(/\/+$/, "");
  const appDir =
    opts.appDir ?? path.join(process.cwd(), "src/app");
  const rules =
    opts.priorities === undefined ? DEFAULT_PRIORITIES : opts.priorities;
  const excludeSet = new Set(opts.excludePaths ?? []);

  const filesystemEntries = walkFilesystemPages(appDir, baseUrl, excludeSet);
  const combined = [...filesystemEntries, ...(opts.extraEntries ?? [])];

  return combined.map((entry) => {
    const pathOnly = entry.url.startsWith(baseUrl)
      ? entry.url.slice(baseUrl.length) || "/"
      : entry.url;
    const match = matchPriority(pathOnly, rules);
    return {
      url: entry.url,
      lastModified: entry.lastModified ?? new Date(),
      changeFrequency: entry.changeFrequency ?? match.changeFrequency,
      priority: entry.priority ?? match.priority,
    };
  });
}

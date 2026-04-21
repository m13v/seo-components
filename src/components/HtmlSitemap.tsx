import type { PageEntry } from "../lib/page-entry";
import { groupByCategory, categoryLabel } from "../lib/page-entry";

export interface HtmlSitemapProps {
  /** All pages discovered via `walkPages()` on the server. */
  pages: PageEntry[];
  /** Brand name used in the heading (e.g. "fde10x"). */
  brandName: string;
  /** Optional heading override. Defaults to "Sitemap". */
  heading?: string;
  /** Optional intro paragraph below the heading. */
  intro?: string;
  /** Override display labels per category slug. Built-ins: t → "Guides" etc. */
  categoryLabels?: Record<string, string>;
  /** Preferred category display order. Unlisted categories follow alphabetically. */
  categoryOrder?: string[];
  /** Extra static links appended after the walked pages (e.g. external /blog). */
  extraLinks?: Array<{ href: string; title: string; description?: string }>;
  /** Show the home page ("/") at the top of the list. Default: true. */
  showHome?: boolean;
  /** Home link label. Default: "Home". */
  homeLabel?: string;
}

function sortCategoryKeys(
  keys: string[],
  preferred: string[] | undefined,
): string[] {
  if (!preferred || preferred.length === 0) return keys.slice().sort();
  const set = new Set(keys);
  const head = preferred.filter((k) => set.has(k));
  const tail = keys.filter((k) => !preferred.includes(k)).sort();
  return [...head, ...tail];
}

/**
 * Human-readable HTML sitemap page. Groups pages by their first URL segment
 * (category) and renders them as a clean grid. Designed as a drop-in body
 * for `src/app/sitemap/page.tsx` alongside the XML sitemap at `/sitemap.xml`.
 *
 * ```tsx
 * // src/app/sitemap/page.tsx
 * import { HtmlSitemap } from "@seo/components";
 * import { walkPages } from "@seo/components/server";
 *
 * export const metadata = { title: "Sitemap — fde10x" };
 *
 * export default function Page() {
 *   const pages = walkPages({ includeHome: false });
 *   return <HtmlSitemap pages={pages} brandName="fde10x" />;
 * }
 * ```
 */
export function HtmlSitemap({
  pages,
  brandName,
  heading = "Sitemap",
  intro,
  categoryLabels,
  categoryOrder,
  extraLinks,
  showHome = true,
  homeLabel = "Home",
}: HtmlSitemapProps) {
  const groups = groupByCategory(pages);
  const orderedKeys = sortCategoryKeys(
    Array.from(groups.keys()),
    categoryOrder,
  );

  return (
    <main className="mx-auto max-w-5xl px-5 sm:px-6 py-12 sm:py-16">
      <header className="mb-10 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {heading}
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
          {intro ??
            `Every page on ${brandName}, grouped by section. ${pages.length} page${pages.length === 1 ? "" : "s"} total.`}
        </p>
      </header>

      {showHome && (
        <section className="mb-10">
          <ul className="grid gap-2">
            <li>
              <a
                href="/"
                className="inline-flex items-center gap-2 text-base font-medium text-zinc-900 dark:text-zinc-100 hover:opacity-70 transition-opacity"
                style={{ color: "var(--seo-accent-dark, #0d9488)" }}
              >
                {homeLabel}
                <span
                  aria-hidden="true"
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--seo-accent, #14b8a6)" }}
                />
              </a>
            </li>
          </ul>
        </section>
      )}

      {orderedKeys.map((key) => {
        const categoryPages = groups.get(key) ?? [];
        if (categoryPages.length === 0) return null;

        const label =
          categoryLabels?.[key] ?? categoryLabel(key) ?? key;

        return (
          <section key={key} className="mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
              {label}
              <span className="ml-2 font-normal text-zinc-400 dark:text-zinc-500">
                {categoryPages.length}
              </span>
            </h2>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {categoryPages.map((page) => (
                <li key={page.href} className="min-w-0">
                  <a
                    href={page.href}
                    className="group block py-2 border-b border-[color-mix(in_srgb,currentColor_10%,transparent)] hover:border-[color-mix(in_srgb,currentColor_18%,transparent)] transition-colors"
                  >
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:opacity-70 transition-opacity line-clamp-2">
                      {page.title}
                    </div>
                    {page.description && (
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {page.description}
                      </div>
                    )}
                    {page.datePublished && (
                      <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                        {page.datePublished}
                      </div>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {extraLinks && extraLinks.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
            More
          </h2>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {extraLinks.map((link) => (
              <li key={link.href} className="min-w-0">
                <a
                  href={link.href}
                  className="group block py-2 border-b border-[color-mix(in_srgb,currentColor_10%,transparent)] hover:border-[color-mix(in_srgb,currentColor_18%,transparent)] transition-colors"
                >
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:opacity-70 transition-opacity">
                    {link.title}
                  </div>
                  {link.description && (
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {link.description}
                    </div>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-16 pt-6 border-t border-[color-mix(in_srgb,currentColor_10%,transparent)]">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Machine-readable version:{" "}
          <a
            href="/sitemap.xml"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            /sitemap.xml
          </a>
        </p>
      </footer>
    </main>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface PageSection {
  id: string;
  title: string;
}

interface PageEntry {
  href: string;
  title: string;
  description: string;
  datePublished?: string;
  sections: PageSection[];
  category: string;
}

export interface SitemapSidebarProps {
  /** All pages to show in the sidebar (from walkPages on the server). */
  pages: PageEntry[];
  /** Brand name shown in the header and footer. */
  brandName: string;
  /** Optional custom logo element. Falls back to brandName text + accent dot. */
  brandLogo?: React.ReactNode;
  /** Link for the brand logo / "Back to ..." link. Default: "/" */
  homeHref?: string;
  /** Custom category labels. Keys are path segments, values are display names.
   *  Built-in defaults: t -> "Guides", blog -> "Blog", compare -> "Comparisons", etc. */
  categoryLabels?: Record<string, string>;
  /** Paths where the sidebar should be hidden (e.g. ["/"] to hide on the home page). */
  hideOnPaths?: string[];
}

const DEFAULT_LABELS: Record<string, string> = {
  t: "Guides",
  compare: "Comparisons",
  blog: "Blog",
  "use-case": "Use Cases",
  automate: "Automations",
  alternative: "Alternatives",
};

function getCategoryLabel(
  category: string,
  custom?: Record<string, string>,
): string {
  if (custom?.[category]) return custom[category];
  if (DEFAULT_LABELS[category]) return DEFAULT_LABELS[category];
  return category
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function groupPages(pages: PageEntry[]): Map<string, PageEntry[]> {
  const groups = new Map<string, PageEntry[]>();
  for (const page of pages) {
    const cat = page.category || "pages";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(page);
  }
  return groups;
}

export function SitemapSidebar({
  pages,
  brandName,
  brandLogo,
  homeHref = "/",
  categoryLabels,
  hideOnPaths,
}: SitemapSidebarProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const filtered = query
    ? pages.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase()),
      )
    : pages;

  const groups = groupPages(filtered);

  const scrollActiveIntoView = () => {
    const active = activeRef.current;
    const nav = navRef.current;
    if (!active || !nav) return;
    const activeRect = active.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const relativeTop = activeRect.top - navRect.top + nav.scrollTop;
    nav.scrollTop = Math.max(0, relativeTop - 24);
  };

  useLayoutEffect(() => {
    scrollActiveIntoView();
    const raf = requestAnimationFrame(scrollActiveIntoView);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Track which H2 section is currently in view.
  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const headings = Array.from(
      article.querySelectorAll<HTMLHeadingElement>("h2[id]"),
    );
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [pathname]);

  // Hide sidebar on specified paths (checked after all hooks)
  if (hideOnPaths?.includes(pathname)) return null;

  const handleSectionClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    e.preventDefault();
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (typeof window !== "undefined") {
        history.replaceState(null, "", `#${sectionId}`);
      }
      setActiveSection(sectionId);
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 left-4 z-50 text-white p-3 rounded-full shadow-lg transition-colors"
        style={{
          backgroundColor: "var(--seo-accent, #14b8a6)",
        }}
        aria-label="Toggle site navigation"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {mobileOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen
          w-72 bg-white border-r border-zinc-200
          flex flex-col
          transition-transform duration-200 ease-out
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-100">
          <a href={homeHref} className="flex items-baseline gap-0 mb-4">
            {brandLogo ?? (
              <>
                <span className="font-mono font-bold text-lg tracking-tight text-zinc-900">
                  {brandName}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full ml-0.5 mb-0.5 inline-block"
                  style={{ backgroundColor: "var(--seo-accent, #14b8a6)" }}
                />
              </>
            )}
          </a>
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={
                {
                  "--tw-ring-color":
                    "color-mix(in srgb, var(--seo-accent, #14b8a6) 20%, transparent)",
                } as React.CSSProperties
              }
            />
          </div>
        </div>

        {/* Page list */}
        <nav ref={navRef} className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 && (
            <p className="text-sm text-zinc-400 px-3 py-4">No pages found</p>
          )}

          {Array.from(groups.entries()).map(([category, categoryPages]) => (
            <div key={category} className="mb-4">
              {/* Category header (only show if more than one category) */}
              {groups.size > 1 && (
                <div className="px-3 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {getCategoryLabel(category, categoryLabels)}
                </div>
              )}

              {categoryPages.map((page) => {
                const isActive = pathname === page.href;
                return (
                  <div key={page.href} className="mb-0.5">
                    <a
                      ref={isActive ? activeRef : null}
                      href={page.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? "text-zinc-900 font-medium"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                      }`}
                      style={
                        isActive
                          ? {
                              backgroundColor:
                                "color-mix(in srgb, var(--seo-accent, #14b8a6) 10%, transparent)",
                              color: "var(--seo-accent-dark, #0d9488)",
                            }
                          : undefined
                      }
                    >
                      <span className="text-sm leading-snug line-clamp-2">
                        {page.title}
                      </span>
                      {page.datePublished && (
                        <span className="text-[11px] text-zinc-400 mt-0.5 block">
                          {page.datePublished}
                        </span>
                      )}
                    </a>

                    {/* Subsections for the active page */}
                    {isActive && page.sections.length > 0 && (
                      <ul className="mt-1 mb-2 ml-3 border-l border-zinc-200 space-y-0.5">
                        {page.sections.map((section) => {
                          const isSectionActive =
                            activeSection === section.id;
                          return (
                            <li key={section.id}>
                              <a
                                href={`#${section.id}`}
                                onClick={(e) =>
                                  handleSectionClick(e, section.id)
                                }
                                className={`block pl-3 pr-2 py-1.5 -ml-px border-l-2 text-[13px] leading-snug transition-colors ${
                                  isSectionActive
                                    ? "font-medium"
                                    : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
                                }`}
                                style={
                                  isSectionActive
                                    ? {
                                        borderColor:
                                          "var(--seo-accent, #14b8a6)",
                                        color:
                                          "var(--seo-accent-dark, #0d9488)",
                                      }
                                    : undefined
                                }
                              >
                                {section.title}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100">
          <a
            href={homeHref}
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--seo-accent, #14b8a6)" }}
          >
            &larr; Back to {brandName}
          </a>
        </div>
      </aside>
    </>
  );
}

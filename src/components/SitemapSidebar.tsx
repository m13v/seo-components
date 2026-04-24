"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  useLayoutAnchorGuard,
  LayoutAnchorWarningBanner,
} from "../lib/useLayoutAnchorGuard";

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
  const [hasExternalBrand, setHasExternalBrand] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);

  const layoutWarning = useLayoutAnchorGuard(sidebarRef, {
    component: "SitemapSidebar",
    minWidth: 1024,
  });

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

  // Hide sidebar brand header if a navbar with a home link already exists on the page.
  useEffect(() => {
    const navs = document.querySelectorAll("nav");
    for (const nav of navs) {
      if (sidebarRef.current?.contains(nav)) continue;
      const homeLink = nav.querySelector('a[href="/"]');
      if (homeLink) {
        setHasExternalBrand(true);
        return;
      }
    }
  }, []);

  // Restore desktop collapse state from localStorage.
  useEffect(() => {
    try {
      if (localStorage.getItem("seo-sidebar-collapsed") === "true") {
        setDesktopCollapsed(true);
      }
    } catch {}
  }, []);

  const toggleDesktopCollapse = () => {
    const next = !desktopCollapsed;
    setDesktopCollapsed(next);
    try { localStorage.setItem("seo-sidebar-collapsed", String(next)); } catch {}
  };

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
      <LayoutAnchorWarningBanner message={layoutWarning} />
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
        ref={sidebarRef}
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen shrink-0
          w-72 ${desktopCollapsed ? "lg:w-12" : ""}
          border-r border-[color-mix(in_srgb,currentColor_14%,transparent)]
          flex flex-col
          transition-all duration-200 ease-out overflow-hidden
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Collapsed desktop view */}
        <div className={`hidden ${desktopCollapsed ? "lg:flex" : ""} flex-col items-center pt-3 h-full`}>
          <button
            onClick={toggleDesktopCollapse}
            className="p-2 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-[color-mix(in_srgb,currentColor_8%,transparent)] transition-colors"
            aria-label="Expand sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Full sidebar content */}
        <div className={`flex flex-col h-full min-w-0 ${desktopCollapsed ? "lg:hidden" : ""}`}>
        {/* Header */}
        <div className="p-4 border-b border-[color-mix(in_srgb,currentColor_10%,transparent)]">
          <div className="flex items-center justify-between mb-3">
            {!hasExternalBrand && (
              <a href={homeHref} className="flex items-baseline gap-0">
                {brandLogo ?? (
                  <>
                    <span className="font-mono font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                      {brandName}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full ml-0.5 mb-0.5 inline-block"
                      style={{ backgroundColor: "var(--seo-accent, #14b8a6)" }}
                    />
                  </>
                )}
              </a>
            )}
            <button
              onClick={toggleDesktopCollapse}
              className="hidden lg:flex p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-[color-mix(in_srgb,currentColor_8%,transparent)] transition-colors ml-auto"
              aria-label="Collapse sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
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
              className="w-full pl-8 pr-3 py-2 text-sm border border-[color-mix(in_srgb,currentColor_14%,transparent)] rounded-lg bg-[color-mix(in_srgb,currentColor_4%,transparent)] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-transparent transition"
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
            <p className="text-sm text-zinc-400 dark:text-zinc-400 px-3 py-4">No pages found</p>
          )}

          {Array.from(groups.entries()).map(([category, categoryPages]) => (
            <div key={category} className="mb-4">
              {/* Category header (only show if more than one category) */}
              {groups.size > 1 && (
                <div className="px-3 py-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider">
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
                          ? "text-zinc-900 dark:text-zinc-100 font-medium"
                          : "text-zinc-600 dark:text-zinc-300 hover:bg-[color-mix(in_srgb,currentColor_4%,transparent)] hover:text-zinc-900 dark:hover:text-zinc-100"
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
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-400 mt-0.5 block">
                          {page.datePublished}
                        </span>
                      )}
                    </a>

                    {/* Subsections for the active page */}
                    {isActive && page.sections.length > 0 && (
                      <ul className="mt-1 mb-2 ml-3 border-l border-[color-mix(in_srgb,currentColor_14%,transparent)] space-y-0.5">
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
                                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-[color-mix(in_srgb,currentColor_25%,transparent)]"
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
        <div className="p-4 border-t border-[color-mix(in_srgb,currentColor_10%,transparent)]">
          <a
            href={homeHref}
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--seo-accent, #14b8a6)" }}
          >
            &larr; Back to {brandName}
          </a>
        </div>
        </div>
      </aside>
    </>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Walks every H2 inside the nearest <article> on mount and sets an `id`
 * attribute derived from the heading text. On initial load, if the URL
 * has a hash, scrolls to the matching heading once IDs are attached.
 *
 * This keeps the sidebar ToC clickable without requiring every page
 * author to add id attributes manually.
 */
export function HeadingAnchors() {
  const pathname = usePathname();

  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const headings = article.querySelectorAll<HTMLHeadingElement>("h2");
    const seen = new Set<string>();
    headings.forEach((h) => {
      const text = (h.textContent || "").trim();
      if (!text) return;
      const base = slugify(text);
      if (!base) return;
      let id = base;
      let i = 2;
      while (seen.has(id)) {
        id = `${base}-${i++}`;
      }
      seen.add(id);
      h.id = id;
      h.style.scrollMarginTop = "16px";
    });

    if (window.location.hash) {
      const target = document.getElementById(
        decodeURIComponent(window.location.hash.slice(1)),
      );
      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, [pathname]);

  return null;
}

export interface PageSection {
  id: string;
  title: string;
}

export interface PageEntry {
  href: string;
  title: string;
  description: string;
  datePublished?: string;
  sections: PageSection[];
  category: string;
}

export function groupByCategory(pages: PageEntry[]): Map<string, PageEntry[]> {
  const groups = new Map<string, PageEntry[]>();
  for (const page of pages) {
    const cat = page.category || "pages";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(page);
  }
  return groups;
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    t: "Guides",
    compare: "Comparisons",
    blog: "Blog",
    "use-case": "Use Cases",
    automate: "Automations",
    alternative: "Alternatives",
  };
  return (
    labels[category] ??
    category
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

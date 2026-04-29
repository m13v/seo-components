import Link from "next/link";
import { ArticleMeta } from "./ArticleMeta";
import { articleSchema, breadcrumbListSchema } from "../lib/json-ld";

export interface BlogPostLayoutProps {
  slug: string;
  title: string;
  description: string;
  date: string;
  lastModified?: string;
  author?: string;
  tags?: string[];
  image?: string;
  siteUrl: string;
  siteName: string;
  publisherLogo?: string;
  blogBasePath?: string;
  htmlContent: string;
  /** Override tag-to-slug conversion. Defaults to kebab-case lowercasing. */
  tagToSlugFn?: (tag: string) => string;
}

function defaultTagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BlogPostLayout({
  slug,
  title,
  description,
  date,
  lastModified,
  author = "Matthew Diakonov",
  tags = [],
  image,
  siteUrl,
  siteName,
  publisherLogo,
  blogBasePath = "/blog",
  htmlContent,
  tagToSlugFn = defaultTagToSlug,
}: BlogPostLayoutProps) {
  const pageUrl = `${siteUrl}${blogBasePath}/${slug}`;
  const ogImage = image || `${siteUrl}/og-default.png`;

  const jsonLd = [
    articleSchema({
      headline: title,
      description,
      url: pageUrl,
      datePublished: date,
      dateModified: lastModified || date,
      author,
      publisherName: siteName,
      publisherUrl: siteUrl,
      publisherLogo,
      image: ogImage,
      articleType: "BlogPosting",
    }),
    breadcrumbListSchema([
      { name: "Home", url: siteUrl },
      { name: "Blog", url: `${siteUrl}${blogBasePath}` },
      { name: title, url: pageUrl },
    ]),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="max-w-3xl mx-auto px-6 py-24">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-zinc-500">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                href={blogBasePath}
                className="hover:text-white transition-colors"
              >
                Blog
              </Link>
            </li>
            <li>/</li>
            <li className="text-white line-clamp-1">{title}</li>
          </ol>
        </nav>

        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {title}
          </h1>
          <ArticleMeta
            author={author}
            datePublished={date}
            dateModified={lastModified}
            className="px-0"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`${blogBasePath}/tag/${tagToSlugFn(tag)}`}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-[color:var(--seo-accent,#14b8a6)]/10 text-[color:var(--seo-accent-light,#2dd4bf)] hover:bg-[color:var(--seo-accent,#14b8a6)]/20 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        <div
          className="seo-blog-prose"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </article>
    </>
  );
}

/**
 * Shared JSON-LD structured data helpers.
 * Product-agnostic: caller provides publisher name, URL, logo, author, etc.
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export function breadcrumbListSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqPageSchema(faqs: FaqItem[], id?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(id ? { "@id": id } : {}),
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

export interface ArticleSchemaInput {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  authorUrl?: string;
  publisherName: string;
  publisherUrl: string;
  publisherLogo?: string;
  image?: string;
  articleType?: "Article" | "BlogPosting" | "TechArticle";
}

export function articleSchema({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  author,
  authorUrl,
  publisherName,
  publisherUrl,
  publisherLogo,
  image,
  articleType = "Article",
}: ArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": articleType,
    headline,
    description,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: author,
      ...(authorUrl ? { url: authorUrl } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: publisherName,
      url: publisherUrl,
      ...(publisherLogo ? { logo: publisherLogo } : {}),
    },
    url,
    mainEntityOfPage: url,
    ...(image ? { image } : {}),
  };
}

export interface HowToStepInput {
  name: string;
  text: string;
}

export function howToSchema(name: string, description: string, steps: HowToStepInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

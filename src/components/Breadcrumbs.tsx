import Link from "next/link";
import { Fragment } from "react";

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbCrumb[];
  className?: string;
  align?: "start" | "center";
}

export function Breadcrumbs({ items, className = "", align = "start" }: BreadcrumbsProps) {
  const justify = align === "center" ? "justify-center" : "justify-start";
  return (
    <nav aria-label="Breadcrumb" className={`max-w-4xl mx-auto px-6 ${className}`}>
      <ol className={`flex flex-wrap items-center ${justify} gap-2 text-sm text-zinc-500`}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className={isLast ? "text-zinc-900 dark:text-zinc-100 line-clamp-1" : ""}>
                {item.href && !isLast ? (
                  <Link href={item.href} className="hover:text-zinc-900 transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </li>
              {!isLast && <li aria-hidden="true">/</li>}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

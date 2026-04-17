import type { FaqItem } from "../lib/json-ld";

interface FaqSectionProps {
  items: FaqItem[];
  heading?: string;
  className?: string;
}

export function FaqSection({
  items,
  heading = "Frequently asked questions",
  className = "",
}: FaqSectionProps) {
  return (
    <section className={`max-w-4xl mx-auto px-6 my-16 ${className}`}>
      <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">{heading}</h2>
      <div className="space-y-4">
        {items.map((faq) => (
          <details
            key={faq.q}
            className="group p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800"
          >
            <summary className="text-zinc-900 dark:text-zinc-100 font-semibold cursor-pointer list-none flex items-center justify-between gap-4">
              <span>{faq.q}</span>
              <span
                className="text-zinc-500 dark:text-zinc-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export type { FaqItem };

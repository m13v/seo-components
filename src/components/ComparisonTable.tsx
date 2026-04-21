export interface ComparisonRow {
  feature: string;
  competitor: string;
  ours: string;
}

interface ComparisonTableProps {
  heading?: string;
  intro?: string;
  productName: string;
  competitorName: string;
  rows: ComparisonRow[];
  caveat?: string;
  className?: string;
}

export function ComparisonTable({
  heading,
  intro,
  productName,
  competitorName,
  rows,
  caveat,
  className = "",
}: ComparisonTableProps) {
  return (
    <section className={className}>
      {heading && (
        <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 text-center">
          {heading}
        </h2>
      )}
      {intro && (
        <p className="text-zinc-500 dark:text-zinc-400 text-lg text-center mb-8 max-w-2xl mx-auto">
          {intro}
        </p>
      )}
      <div className="rounded-2xl bg-[color-mix(in_srgb,currentColor_3%,transparent)] border border-[color-mix(in_srgb,currentColor_14%,transparent)] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,currentColor_14%,transparent)]">
              <th className="px-5 py-4 text-zinc-500 dark:text-zinc-400 text-sm font-medium">Feature</th>
              <th className="px-5 py-4 text-zinc-500 dark:text-zinc-400 text-sm font-medium">{competitorName}</th>
              <th className="px-5 py-4 text-teal-600 dark:text-teal-400 text-sm font-medium">{productName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={i < rows.length - 1 ? "border-b border-[color-mix(in_srgb,currentColor_14%,transparent)]" : ""}
              >
                <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100 text-sm font-medium">{row.feature}</td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400 text-sm">{row.competitor}</td>
                <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100 text-sm">{row.ours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caveat && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-4 text-center">{caveat}</p>
      )}
    </section>
  );
}

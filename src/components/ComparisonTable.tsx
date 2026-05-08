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
        <p className="text-zinc-700 dark:text-zinc-300 text-lg text-center mb-8 max-w-2xl mx-auto">
          {intro}
        </p>
      )}
      <div className="rounded-2xl bg-[color-mix(in_srgb,currentColor_3%,transparent)] border border-[color-mix(in_srgb,currentColor_14%,transparent)] overflow-x-auto">
        {/* min-w on table so 3 columns don't crush long copy on <420px viewports; horizontal scroll engages instead. */}
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,currentColor_14%,transparent)]">
              <th className="px-5 py-4 text-zinc-800 dark:text-zinc-200 text-sm font-semibold">Feature</th>
              <th className="px-5 py-4 text-zinc-800 dark:text-zinc-200 text-sm font-semibold">{competitorName}</th>
              <th className="px-5 py-4 text-teal-700 dark:text-teal-300 text-sm font-semibold">{productName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={i < rows.length - 1 ? "border-b border-[color-mix(in_srgb,currentColor_14%,transparent)]" : ""}
              >
                <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100 text-sm font-medium">{row.feature}</td>
                <td className="px-5 py-3 text-zinc-700 dark:text-zinc-300 text-sm">{row.competitor}</td>
                <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100 text-sm">{row.ours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caveat && (
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-4 text-center">{caveat}</p>
      )}
    </section>
  );
}

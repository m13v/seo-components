interface ProofBandProps {
  rating: number;
  ratingCount: string;
  highlights?: string[];
  className?: string;
}

export function ProofBand({
  rating,
  ratingCount,
  highlights = [],
  className = "",
}: ProofBandProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;

  return (
    <div className={`text-sm text-zinc-500 mb-8 max-w-4xl mx-auto px-6 ${className}`}>
      {/* Stars + rating on its own line */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <svg
              key={i}
              className={`w-4 h-4 ${
                i < fullStars
                  ? "text-teal-500"
                  : i === fullStars && hasHalf
                    ? "text-teal-300"
                    : "text-zinc-200"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
            </svg>
          ))}
        </div>
        <span className="text-zinc-700 dark:text-zinc-300 font-medium">{rating.toFixed(1)}</span>
        <span className="text-zinc-400">from {ratingCount}</span>
      </div>

      {/* Highlights as a clean vertical list */}
      {highlights.length > 0 && (
        <div className="flex flex-col gap-1">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-teal-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-600 dark:text-zinc-400">{h}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

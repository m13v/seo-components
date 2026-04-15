interface InlineTestimonialProps {
  quote: string;
  name: string;
  role?: string;
  stars?: 1 | 2 | 3 | 4 | 5;
  className?: string;
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < count ? "text-teal-600" : "text-zinc-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </div>
  );
}

export function InlineTestimonial({
  quote,
  name,
  role,
  stars = 5,
  className = "",
}: InlineTestimonialProps) {
  return (
    <figure
      className={`p-6 sm:p-8 rounded-2xl bg-zinc-50 border border-zinc-200 ${className}`}
    >
      <Stars count={stars} />
      <blockquote className="mt-4 text-lg sm:text-xl leading-relaxed text-zinc-800">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/40 to-teal-500/10 flex items-center justify-center text-sm font-semibold text-white">
          {name.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-medium text-zinc-900">{name}</div>
          {role && <div className="text-xs text-zinc-500">{role}</div>}
        </div>
      </figcaption>
    </figure>
  );
}

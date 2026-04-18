interface ArticleMetaProps {
  author?: string;
  authorRole?: string;
  datePublished: string;
  dateModified?: string;
  readingTime?: string;
  className?: string;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ArticleMeta({
  author = "Matthew Diakonov",
  authorRole,
  datePublished,
  dateModified,
  readingTime,
  className = "",
}: ArticleMetaProps) {
  const showUpdated = dateModified && dateModified !== datePublished;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-500 max-w-4xl mx-auto px-6 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500/40 to-teal-500/10 flex items-center justify-center text-xs font-semibold text-white">
          {author.charAt(0)}
        </div>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{author}</span>
        {authorRole && <span className="hidden sm:inline text-zinc-500">, {authorRole}</span>}
      </div>
      <span aria-hidden="true">&middot;</span>
      <time dateTime={datePublished}>
        {showUpdated ? "Updated " : "Published "}
        {formatDate(dateModified || datePublished)}
      </time>
      {readingTime && (
        <>
          <span aria-hidden="true">&middot;</span>
          <span>{readingTime}</span>
        </>
      )}
    </div>
  );
}

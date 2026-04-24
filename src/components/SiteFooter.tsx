export interface SiteFooterProps {
  /** Brand name. Used for the copyright line ("© 2026 Fazm."). */
  brandName: string;
  /** Optional custom brand element (logo component, styled text). Shown on
   *  the left. Falls back to `brandName` as plain bold text. */
  brandLogo?: React.ReactNode;
  /** Tagline shown next to the brand (e.g. "AI Computer Agent for macOS"). */
  tagline?: string;
  /** Copyright line suffix (e.g. "All rights reserved." or "MIT License.").
   *  Default: "All rights reserved." */
  copyrightSuffix?: string;
  /** Extra classes merged onto the outer <footer>. Defaults adapt to
   *  light/dark via `dark:`. */
  className?: string;
}

/**
 * Minimal site footer shared across every SEO page. Mount once in the
 * site's intermediate layout alongside SiteNavbar. Individual pages must
 * NOT render a footer themselves.
 *
 * @example
 * <SiteFooter
 *   brandName="Assrt"
 *   brandLogo={<Logo size="sm" />}
 *   tagline="Open-source AI testing framework"
 *   copyrightSuffix="MIT License."
 * />
 */
export function SiteFooter({
  brandName,
  brandLogo,
  tagline,
  copyrightSuffix = "All rights reserved.",
  className = "",
}: SiteFooterProps) {
  return (
    <footer
      className={
        "border-t py-10 " +
        "border-zinc-200 bg-zinc-50 text-zinc-500 " +
        "dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400 " +
        className
      }
    >
      <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          {brandLogo ?? (
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {brandName}
            </span>
          )}
          {tagline && (
            <span className="text-xs text-zinc-500 dark:text-zinc-500 ml-2">
              {tagline}
            </span>
          )}
        </div>
        <div className="text-xs">
          &copy; {new Date().getFullYear()} {brandName}. {copyrightSuffix}
        </div>
      </div>
    </footer>
  );
}

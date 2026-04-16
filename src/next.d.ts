import type { NextConfig } from "next";

export interface WithSeoContentOptions {
  /** Relative path to your content directory. Default: "src/app/t". */
  contentDir?: string;
}

export function withSeoContent(
  config?: NextConfig,
  opts?: WithSeoContentOptions,
): NextConfig;

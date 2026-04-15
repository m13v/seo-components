"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface LottiePlayerProps {
  /** Lottie JSON data — inline or via import */
  animationData?: unknown;
  /** Path to a Lottie JSON file. Will be fetched at runtime. */
  src?: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  height?: number | string;
  width?: number | string;
}

/**
 * Lottie animation player. Pass either animationData (JSON object)
 * or src (URL/path). Loads client-side only (ssr: false) because
 * lottie-web needs window.
 */
export function LottiePlayer({
  animationData,
  src,
  loop = true,
  autoplay = true,
  className = "",
  height = 240,
  width = "100%",
}: LottiePlayerProps) {
  const [data, setData] = useState<unknown>(animationData ?? null);

  useEffect(() => {
    if (data || !src) return;
    fetch(src)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [data, src]);

  if (!data) {
    return (
      <div
        className={`my-6 rounded-xl border border-zinc-200 bg-zinc-50 ${className}`}
        style={{ height, width }}
      />
    );
  }

  return (
    <div className={`my-6 ${className}`} style={{ height, width }}>
      <Lottie
        animationData={data}
        loop={loop}
        autoplay={autoplay}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}

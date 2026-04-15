"use client";

import { Player } from "@remotion/player";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/* ------------------------------------------------------------------ */
/* Built-in composition: "ConceptReveal"                              */
/* Dead simple: a stack of captions fading+sliding in, with a tinted  */
/* gradient background and a growing progress bar.                    */
/* ------------------------------------------------------------------ */

interface ConceptRevealProps {
  title: string;
  subtitle?: string;
  captions: string[];
  accent?: "teal" | "cyan";
  /** Override hex color for the primary gradient stop. If set, takes precedence over `accent`. */
  accentHex?: string;
  /** Override hex color for the secondary (dark) gradient stop. If set, takes precedence over `accent`. */
  accentHexDark?: string;
}

export function ConceptReveal({
  title,
  subtitle,
  captions,
  accent = "teal",
  accentHex,
  accentHexDark,
}: ConceptRevealProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleOpacity = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 200 } }),
    [0, 1],
    [24, 0]
  );

  const subtitleProgress = spring({
    frame: frame - 8,
    fps,
    config: { damping: 200 },
  });

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  const bgA = accentHex ?? (accent === "teal" ? "#14b8a6" : "#06b6d4");
  const bgB = accentHexDark ?? (accent === "teal" ? "#0d9488" : "#0891b2");

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${bgA} 0%, ${bgB} 100%)`,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "white",
        padding: 56,
      }}
    >
      {/* Subtle grid overlay */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1,
            marginBottom: 16,
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              opacity: subtitleProgress * 0.85,
              transform: `translateY(${interpolate(subtitleProgress, [0, 1], [20, 0])}px)`,
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.4,
              marginBottom: 40,
            }}
          >
            {subtitle}
          </div>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
          {captions.map((caption, i) => {
            const captionStart = 18 + i * 14;
            const captionProgress = spring({
              frame: frame - captionStart,
              fps,
              config: { damping: 200, stiffness: 120 },
            });
            const opacity = captionProgress;
            const x = interpolate(captionProgress, [0, 1], [-20, 0]);
            return (
              <div
                key={i}
                style={{
                  opacity,
                  transform: `translateX(${x}px)`,
                  fontSize: 32,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "white",
                    opacity: 0.9,
                    flexShrink: 0,
                  }}
                />
                {caption}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 40,
            height: 4,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              background: "white",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ */
/* Public wrapper                                                     */
/* ------------------------------------------------------------------ */

interface RemotionClipProps {
  title: string;
  subtitle?: string;
  captions: string[];
  accent?: "teal" | "cyan";
  /** Override hex color for the primary gradient stop. If set, takes precedence over `accent`. */
  accentHex?: string;
  /** Override hex color for the secondary (dark) gradient stop. If set, takes precedence over `accent`. */
  accentHexDark?: string;
  durationInFrames?: number;
  fps?: number;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

/**
 * Remotion-powered video clip rendered in the browser via @remotion/player.
 * Uses the built-in ConceptReveal composition. Pass a title, optional subtitle,
 * and 3-6 captions; the clip animates them with spring physics on a gradient
 * background. No video file, everything is code-generated.
 */
export function RemotionClip({
  title,
  subtitle,
  captions,
  accent = "teal",
  accentHex,
  accentHexDark,
  durationInFrames = 150,
  fps = 30,
  width = 1280,
  height = 720,
  autoPlay = true,
  loop = true,
  className = "",
}: RemotionClipProps) {
  return (
    <div
      className={`my-10 rounded-2xl overflow-hidden border border-zinc-200 shadow-lg ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Player
        component={ConceptReveal}
        durationInFrames={durationInFrames}
        compositionWidth={width}
        compositionHeight={height}
        fps={fps}
        autoPlay={autoPlay}
        loop={loop}
        controls
        style={{ width: "100%", height: "100%" }}
        inputProps={{ title, subtitle, captions, accent, accentHex, accentHexDark }}
      />
    </div>
  );
}

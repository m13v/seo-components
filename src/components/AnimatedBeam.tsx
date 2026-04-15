"use client";

import { motion } from "framer-motion";

interface BeamNode {
  label: string;
  sublabel?: string;
}

interface AnimatedBeamProps {
  /** Left side nodes (sources) */
  from: BeamNode[];
  /** Single center node (aggregator) */
  hub: BeamNode;
  /** Right side nodes (destinations) */
  to: BeamNode[];
  title?: string;
  /** Accent hex color for the hub fill and beam glow. Defaults to teal (#14b8a6). */
  accentColor?: string;
  className?: string;
}

/**
 * Magic UI style animated beam diagram. A central hub connects to
 * sources on the left and destinations on the right. Animated
 * gradient beams travel along each connection. Pure SVG, no deps
 * beyond framer-motion.
 */
export function AnimatedBeam({
  from,
  hub,
  to,
  title,
  accentColor = "#14b8a6",
  className = "",
}: AnimatedBeamProps) {
  const width = 720;
  const height = 380;
  const centerX = width / 2;
  const centerY = height / 2;
  const leftX = 96;
  const rightX = width - 96;

  const leftPositions = from.map(
    (_, i) => (i + 1) * (height / (from.length + 1))
  );
  const rightPositions = to.map(
    (_, i) => (i + 1) * (height / (to.length + 1))
  );

  return (
    <div
      className={`my-10 rounded-2xl border border-zinc-200 bg-white p-6 ${className}`}
    >
      {title && (
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h3>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0" />
            <stop offset="50%" stopColor={accentColor} stopOpacity="1" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base connection lines */}
        {leftPositions.map((y, i) => (
          <path
            key={`from-line-${i}`}
            d={`M ${leftX + 60} ${y} Q ${centerX - 80} ${y}, ${centerX - 40} ${centerY}`}
            stroke="#e4e4e7"
            strokeWidth="2"
            fill="none"
          />
        ))}
        {rightPositions.map((y, i) => (
          <path
            key={`to-line-${i}`}
            d={`M ${centerX + 40} ${centerY} Q ${centerX + 80} ${y}, ${rightX - 60} ${y}`}
            stroke="#e4e4e7"
            strokeWidth="2"
            fill="none"
          />
        ))}

        {/* Animated beam overlays */}
        {leftPositions.map((y, i) => (
          <motion.path
            key={`from-beam-${i}`}
            d={`M ${leftX + 60} ${y} Q ${centerX - 80} ${y}, ${centerX - 40} ${centerY}`}
            stroke="url(#beam-gradient)"
            strokeWidth="3"
            fill="none"
            strokeDasharray="40 160"
            filter="url(#glow)"
            initial={{ strokeDashoffset: 200 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.3,
            }}
          />
        ))}
        {rightPositions.map((y, i) => (
          <motion.path
            key={`to-beam-${i}`}
            d={`M ${centerX + 40} ${centerY} Q ${centerX + 80} ${y}, ${rightX - 60} ${y}`}
            stroke="url(#beam-gradient)"
            strokeWidth="3"
            fill="none"
            strokeDasharray="40 160"
            filter="url(#glow)"
            initial={{ strokeDashoffset: 200 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.3 + 1,
            }}
          />
        ))}

        {/* Left nodes */}
        {from.map((node, i) => (
          <g key={`from-${i}`}>
            <rect
              x={leftX - 60}
              y={leftPositions[i] - 24}
              width="120"
              height="48"
              rx="8"
              fill="white"
              stroke="#e4e4e7"
              strokeWidth="1.5"
            />
            <foreignObject
              x={leftX - 56}
              y={leftPositions[i] - 20}
              width="112"
              height="40"
            >
              <div
                // @ts-expect-error -- xmlns is valid in foreignObject
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: "#18181b",
                  overflow: "hidden",
                  wordBreak: "break-word",
                }}
              >
                {node.label}
              </div>
            </foreignObject>
          </g>
        ))}

        {/* Center hub */}
        <g>
          <rect
            x={centerX - 72}
            y={centerY - 36}
            width="144"
            height="72"
            rx="36"
            fill={accentColor}
            filter="url(#glow)"
          />
          <rect
            x={centerX - 72}
            y={centerY - 36}
            width="144"
            height="72"
            rx="36"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />
          <foreignObject
            x={centerX - 64}
            y={centerY - 28}
            width="128"
            height="56"
          >
            <div
              // @ts-expect-error -- xmlns is valid in foreignObject
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                textAlign: "center",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.2,
                color: "white",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {hub.label}
            </div>
          </foreignObject>
        </g>

        {/* Right nodes */}
        {to.map((node, i) => (
          <g key={`to-${i}`}>
            <rect
              x={rightX - 60}
              y={rightPositions[i] - 24}
              width="120"
              height="48"
              rx="8"
              fill="white"
              stroke="#e4e4e7"
              strokeWidth="1.5"
            />
            <foreignObject
              x={rightX - 56}
              y={rightPositions[i] - 20}
              width="112"
              height="40"
            >
              <div
                // @ts-expect-error -- xmlns is valid in foreignObject
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: "#18181b",
                  overflow: "hidden",
                  wordBreak: "break-word",
                }}
              >
                {node.label}
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>
    </div>
  );
}

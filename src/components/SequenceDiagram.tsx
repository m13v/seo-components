"use client";

import { motion } from "framer-motion";

interface SequenceMessage {
  from: number;
  to: number;
  label: string;
  type?: "request" | "response" | "event" | "error";
}

interface SequenceDiagramProps {
  title: string;
  actors: string[];
  messages: SequenceMessage[];
}

const typeStyles: Record<string, { stroke: string; text: string; dash?: string }> = {
  request: { stroke: "stroke-emerald-500", text: "text-emerald-500" },
  response: { stroke: "stroke-teal-500", text: "text-teal-600", dash: "6 3" },
  event: { stroke: "stroke-amber-400", text: "text-amber-400" },
  error: { stroke: "stroke-red-400", text: "text-red-400", dash: "4 4" },
};

export function SequenceDiagram({ title, actors, messages }: SequenceDiagramProps) {
  const colWidth = 160;
  const rowHeight = 48;
  const headerHeight = 60;
  const svgWidth = colWidth * actors.length;
  const svgHeight = headerHeight + rowHeight * messages.length + 32;

  return (
    <motion.div
      className="my-10 rounded-2xl border border-zinc-200 bg-white p-6 overflow-x-auto"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="text-xs font-mono uppercase tracking-widest text-emerald-500 mb-4">
        {title}
      </p>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width={svgWidth}
        height={svgHeight}
        className="max-w-full"
      >
        {/* Actor headers */}
        {actors.map((actor, i) => {
          const cx = colWidth * i + colWidth / 2;
          return (
            <motion.g
              key={`actor-${i}`}
              initial={{ opacity: 0, y: -8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <rect
                x={cx - 56}
                y={8}
                width={112}
                height={32}
                rx={8}
                className="fill-white stroke-zinc-200"
                strokeWidth={1}
              />
              <text
                x={cx}
                y={29}
                textAnchor="middle"
                className="fill-zinc-900 text-[11px] font-medium"
                fontFamily="ui-monospace, monospace"
              >
                {actor}
              </text>
              {/* Lifeline */}
              <line
                x1={cx}
                y1={44}
                x2={cx}
                y2={svgHeight - 8}
                className="stroke-zinc-200"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            </motion.g>
          );
        })}

        {/* Messages */}
        {messages.map((msg, i) => {
          const y = headerHeight + rowHeight * i + rowHeight / 2;
          const fromX = colWidth * msg.from + colWidth / 2;
          const toX = colWidth * msg.to + colWidth / 2;
          const isLeft = toX < fromX;
          const style = typeStyles[msg.type || "request"];
          const arrowX = toX + (isLeft ? 6 : -6);

          return (
            <motion.g
              key={`msg-${i}`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
            >
              <line
                x1={fromX}
                y1={y}
                x2={toX}
                y2={y}
                className={style.stroke}
                strokeWidth={1.5}
                strokeDasharray={style.dash}
                markerEnd=""
              />
              {/* Arrowhead */}
              <polygon
                points={
                  isLeft
                    ? `${arrowX},${y} ${arrowX + 7},${y - 4} ${arrowX + 7},${y + 4}`
                    : `${arrowX},${y} ${arrowX - 7},${y - 4} ${arrowX - 7},${y + 4}`
                }
                className={style.stroke.replace("stroke-", "fill-")}
              />
              {/* Label */}
              <text
                x={(fromX + toX) / 2}
                y={y - 8}
                textAnchor="middle"
                className={`${style.text} text-[10px]`}
                fontFamily="ui-monospace, monospace"
              >
                {msg.label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </motion.div>
  );
}

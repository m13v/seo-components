"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

interface TerminalLine {
  text: string;
  type?: "command" | "output" | "success" | "error" | "info";
  delay?: number;
}

interface TerminalOutputProps {
  lines: TerminalLine[];
  title?: string;
}

const typeColors: Record<string, string> = {
  command: "text-emerald-400",
  output: "text-zinc-400",
  success: "text-emerald-500",
  error: "text-red-400",
  info: "text-amber-400",
};

const prefixes: Record<string, string> = {
  command: "$ ",
  output: "  ",
  success: "\u2713 ",
  error: "\u2717 ",
  info: "\u2139 ",
};

export function TerminalOutput({ lines, title = "Terminal" }: TerminalOutputProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let i = 0;
    const showNext = () => {
      i++;
      setVisibleCount(i);
      if (i < lines.length) {
        const nextDelay = lines[i]?.delay ?? (lines[i]?.type === "command" ? 400 : 120);
        setTimeout(showNext, nextDelay);
      }
    };
    const firstDelay = lines[0]?.delay ?? 300;
    setTimeout(showNext, firstDelay);
  }, [isInView, lines]);

  return (
    <motion.div
      ref={ref}
      className="my-8 rounded-2xl border border-zinc-800 bg-[#0d1117] overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
        </div>
        <span className="text-[11px] font-mono text-[#8b949e] ml-1">{title}</span>
      </div>
      <div className="p-4 font-mono text-sm min-h-[120px]">
        {lines.slice(0, visibleCount).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className={`${typeColors[line.type || "output"]} leading-relaxed`}
          >
            <span className="opacity-50">{prefixes[line.type || "output"]}</span>
            {line.text}
          </motion.div>
        ))}
        {visibleCount < lines.length && isInView && (
          <motion.span
            className="inline-block w-[7px] h-[14px] bg-emerald-500 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
          />
        )}
      </div>
    </motion.div>
  );
}

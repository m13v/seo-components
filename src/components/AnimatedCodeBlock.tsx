"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

interface AnimatedCodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  typingSpeed?: number;
}

export function AnimatedCodeBlock({
  code,
  language = "typescript",
  filename,
  typingSpeed = 12,
}: AnimatedCodeBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [displayedLines, setDisplayedLines] = useState(0);
  const lines = code.split("\n");

  useEffect(() => {
    if (!isInView) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedLines(i);
      if (i >= lines.length) clearInterval(interval);
    }, typingSpeed);
    return () => clearInterval(interval);
  }, [isInView, lines.length, typingSpeed]);

  return (
    <motion.div
      ref={ref}
      className="my-6 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {filename && (
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
          </div>
          <span className="text-[11px] font-mono text-zinc-400 ml-1">{filename}</span>
        </div>
      )}
      <pre className="p-5 text-sm font-mono overflow-x-auto">
        <code className="text-code-text">
          {lines.slice(0, displayedLines).join("\n")}
          {displayedLines < lines.length && isInView && (
            <motion.span
              className="inline-block w-[7px] h-[14px] bg-emerald-500 ml-0.5 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
            />
          )}
        </code>
      </pre>
    </motion.div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SequenceFrame {
  title?: string;
  body?: React.ReactNode;
  visual?: React.ReactNode;
  duration?: number;
}

interface MotionSequenceProps {
  title?: string;
  frames: SequenceFrame[];
  defaultDuration?: number;
  loop?: boolean;
  className?: string;
}

/**
 * Video-style timeline animation. Plays through a list of frames
 * with timed reveals, like a Remotion composition rendered live.
 * Each frame has a duration; the sequence advances automatically
 * when the component scrolls into view.
 */
export function MotionSequence({
  title,
  frames,
  defaultDuration = 2400,
  loop = true,
  className = "",
}: MotionSequenceProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPlaying(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const current = frames[index];
    const d = current?.duration ?? defaultDuration;
    const t = setTimeout(() => {
      if (index < frames.length - 1) {
        setIndex(index + 1);
      } else if (loop) {
        setIndex(0);
      }
    }, d);
    return () => clearTimeout(t);
  }, [index, playing, frames, defaultDuration, loop]);

  const current = frames[index];
  const total = frames.length;

  return (
    <div
      ref={containerRef}
      className={`my-10 rounded-2xl border border-zinc-200 bg-white overflow-hidden ${className}`}
    >
      {title && (
        <div className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {frames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-teal-500" : "w-1.5 bg-zinc-300"
                  }`}
                  aria-label={`Frame ${i + 1}`}
                />
              ))}
            </div>
            <span className="text-xs font-mono text-zinc-500 tabular-nums">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}

      <div className="relative min-h-[280px] bg-gradient-to-br from-zinc-50 to-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute inset-0 p-8 flex flex-col items-center justify-center"
          >
            {current?.visual && (
              <div className="mb-6 w-full flex justify-center">
                {current.visual}
              </div>
            )}
            {current?.title && (
              <motion.h4
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="text-xl font-semibold text-zinc-900 text-center mb-2"
              >
                {current.title}
              </motion.h4>
            )}
            {current?.body && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="text-sm text-zinc-500 text-center max-w-md leading-relaxed"
              >
                {current.body}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        key={index}
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{
          duration: (current?.duration ?? defaultDuration) / 1000,
          ease: "linear",
        }}
        className="h-0.5 bg-gradient-to-r from-cyan-500 to-teal-500"
      />
    </div>
  );
}

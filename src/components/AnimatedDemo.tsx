"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";

interface DemoStep {
  /** What appears in the "screen" */
  screen: string;
  /** What appears in the narration/caption */
  caption: string;
  /** Duration in ms before advancing to next step */
  duration?: number;
}

interface AnimatedDemoProps {
  title: string;
  steps: DemoStep[];
  /** Optional code that reproduces this demo */
  code?: string;
  codeLanguage?: string;
  className?: string;
}

export function AnimatedDemo({
  title,
  steps,
  code,
  codeLanguage = "tsx",
  className = "",
}: AnimatedDemoProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isInView && !isPlaying) {
      setIsPlaying(true);
    }
  }, [isInView, isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const step = steps[currentStep];
    const dur = step?.duration || 2000;

    timerRef.current = setTimeout(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, dur);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentStep, isPlaying, steps]);

  const step = steps[currentStep];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`my-10 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono font-medium text-teal-600 tracking-wider uppercase">
          {title}
        </span>
        {code && (
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors font-mono"
          >
            {showCode ? "Hide code" : "View code"}
          </button>
        )}
      </div>

      {/* Demo screen */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-950 overflow-hidden shadow-lg">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          <span className="ml-3 text-[11px] text-zinc-500 font-mono">
            mk0r preview
          </span>
        </div>

        {/* Screen content */}
        <div className="relative min-h-[180px] flex items-center justify-center p-8">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <p className="text-white font-mono text-sm leading-relaxed whitespace-pre-line">
              {step?.screen}
            </p>
          </motion.div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-zinc-800 overflow-hidden">
          <motion.div
            key={`progress-${currentStep}`}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: (step?.duration || 2000) / 1000,
              ease: "linear",
            }}
            className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
          />
        </div>
      </div>

      {/* Caption */}
      <motion.p
        key={`caption-${currentStep}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-3 text-sm text-zinc-500 text-center"
      >
        <span className="inline-flex items-center gap-2">
          <span className="text-xs font-mono text-teal-500">
            {currentStep + 1}/{steps.length}
          </span>
          {step?.caption}
        </span>
      </motion.p>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              i === currentStep
                ? "bg-teal-500 w-4"
                : i < currentStep
                  ? "bg-teal-300"
                  : "bg-zinc-300"
            }`}
          />
        ))}
      </div>

      {/* Code panel */}
      {code && showCode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4"
        >
          <div className="rounded-xl border border-zinc-200 bg-zinc-950 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
              <span className="text-[11px] text-zinc-500 font-mono">
                {codeLanguage}
              </span>
              <span className="text-[10px] text-zinc-600 font-mono">
                How to build this
              </span>
            </div>
            <pre className="p-4 text-sm text-zinc-300 font-mono overflow-x-auto leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

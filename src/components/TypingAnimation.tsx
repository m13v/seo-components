"use client";

import { useEffect, useState } from "react";

/**
 * TypingAnimation: displays a string character by character, simulating a
 * typewriter effect. Good for hero headlines, terminal-style intros, or
 * any text you want to reveal progressively.
 *
 * @example
 * <TypingAnimation text="Build and ship in minutes" duration={80} />
 */

interface TypingAnimationProps {
  /** The full string to type out. */
  text: string;
  /** Milliseconds between each character. Defaults to 200. */
  duration?: number;
  /** Additional Tailwind classes. */
  className?: string;
}

export function TypingAnimation({
  text,
  duration = 200,
  className,
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState<string>("");
  const [i, setI] = useState<number>(0);

  useEffect(() => {
    const typingEffect = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        setI(i + 1);
      } else {
        clearInterval(typingEffect);
      }
    }, duration);

    return () => {
      clearInterval(typingEffect);
    };
  }, [duration, i, text]);

  const base =
    "font-display text-center text-4xl font-bold leading-[5rem] tracking-[-0.02em] drop-shadow-sm text-zinc-900";

  return (
    <h1 className={className ? `${base} ${className}` : base}>
      {displayedText ? displayedText : text}
    </h1>
  );
}

"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * MorphingText: cycles through an array of strings with a smooth blur/opacity
 * morph transition. Useful for hero headlines that rotate through value props
 * or keywords. Purely CSS + requestAnimationFrame, no framer-motion needed.
 *
 * @example
 * <MorphingText texts={["Ship faster", "Convert more", "Rank higher"]} />
 */

const MORPH_TIME = 1;
const COOLDOWN_TIME = 0.5;

function useMorphingText(texts: string[]) {
  const textIndexRef = useRef(0);
  const morphRef = useRef(0);
  const cooldownRef = useRef(0);
  const timeRef = useRef(new Date());

  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);

  const setStyles = useCallback(
    (fraction: number) => {
      const [current1, current2] = [text1Ref.current, text2Ref.current];
      if (!current1 || !current2) return;

      current2.style.filter = `blur(${Math.min(4 / fraction - 4, 4)}px)`;
      current2.style.opacity = `${Math.pow(fraction, 1.5) * 100}%`;

      const invertedFraction = 1 - fraction;
      current1.style.filter = `blur(${Math.min(
        4 / invertedFraction - 4,
        4
      )}px)`;
      current1.style.opacity = `${Math.pow(invertedFraction, 3) * 100}%`;

      current1.textContent = texts[textIndexRef.current % texts.length];
      current2.textContent =
        texts[(textIndexRef.current + 1) % texts.length];
    },
    [texts]
  );

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current;
    cooldownRef.current = 0;

    let fraction = morphRef.current / MORPH_TIME;

    if (fraction > 1) {
      cooldownRef.current = COOLDOWN_TIME;
      fraction = 1;
    }

    setStyles(fraction);

    if (fraction === 1) {
      textIndexRef.current++;
    }
  }, [setStyles]);

  const doCooldown = useCallback(() => {
    morphRef.current = 0;
    const [current1, current2] = [text1Ref.current, text2Ref.current];
    if (current1 && current2) {
      current2.style.filter = "none";
      current2.style.opacity = "100%";
      current1.style.filter = "none";
      current1.style.opacity = "0%";
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const newTime = new Date();
      const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000;
      timeRef.current = newTime;

      cooldownRef.current -= dt;

      if (cooldownRef.current <= 0) doMorph();
      else doCooldown();
    };

    animate();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [doMorph, doCooldown]);

  return { text1Ref, text2Ref };
}

interface MorphingTextProps {
  /** Array of strings to cycle through */
  texts: string[];
  /** Additional Tailwind classes for the outer wrapper */
  className?: string;
}

function Texts({ texts }: { texts: string[] }) {
  const { text1Ref, text2Ref } = useMorphingText(texts);
  return (
    <>
      <span
        className="absolute inset-x-0 top-0 m-auto inline-block w-full text-center text-zinc-900 [will-change:filter,opacity] antialiased"
        ref={text1Ref}
      />
      <span
        className="absolute inset-x-0 top-0 m-auto inline-block w-full text-center text-zinc-900 [will-change:filter,opacity] antialiased"
        ref={text2Ref}
      />
    </>
  );
}

export function MorphingText({ texts, className }: MorphingTextProps) {
  const base =
    "relative mx-auto h-16 w-full max-w-screen-xl text-center text-[40pt] leading-none font-extrabold tracking-tight md:h-24 lg:text-[6rem] [text-rendering:optimizeLegibility] [font-smooth:antialiased] [-webkit-font-smoothing:antialiased] [-moz-osx-font-smoothing:grayscale]";
  return (
    <div className={className ? `${base} ${className}` : base}>
      <Texts texts={texts} />
    </div>
  );
}

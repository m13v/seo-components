"use client";

import { motion } from "framer-motion";

export interface BentoCard {
  title: string;
  description: string;
  /** "1x1" | "2x1" (wide) | "1x2" (tall) | "2x2" (hero) */
  size?: "1x1" | "2x1" | "1x2" | "2x2";
  icon?: string;
  accent?: boolean;
  content?: React.ReactNode;
}

interface BentoGridProps {
  cards: BentoCard[];
  className?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  "1x1": "col-span-1 row-span-1",
  "2x1": "col-span-2 row-span-1",
  "1x2": "col-span-1 row-span-2",
  "2x2": "col-span-2 row-span-2",
};

export function BentoGrid({ cards, className = "" }: BentoGridProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-10 ${className}`}
    >
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1],
            delay: i * 0.06,
          }}
          className={`${SIZE_CLASSES[card.size || "1x1"]} rounded-2xl border ${
            card.accent
              ? "border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50"
              : "border-zinc-200 bg-zinc-50"
          } p-6 flex flex-col justify-between group hover:border-teal-300 hover:shadow-md transition-all duration-300`}
        >
          <div>
            {card.icon && (
              <span className="text-2xl mb-3 block">{card.icon}</span>
            )}
            <h3 className="text-base font-semibold text-zinc-900 mb-2">
              {card.title}
            </h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {card.description}
            </p>
          </div>
          {card.content && (
            <div className="mt-4 overflow-hidden rounded-lg">{card.content}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

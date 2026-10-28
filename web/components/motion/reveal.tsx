"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Adds `.js-reveal` to <html> so scroll-reveal initial states apply only with JS. */
export function MotionInit() {
  useEffect(() => {
    document.documentElement.classList.add("js-reveal");
  }, []);
  return null;
}

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in ms (kept short; 350–550ms total entrances). */
  delay?: number;
  as?: "div" | "li" | "section" | "span";
};

/**
 * Scroll-triggered entrance: fades and rises once when the element enters
 * the viewport. Renders content normally without JS; honors
 * prefers-reduced-motion via the global CSS kill-switch.
 */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

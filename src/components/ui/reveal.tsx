"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

/** Fades content up when it enters the viewport. Renders visible immediately if IntersectionObserver is unavailable. */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "li" | "section" }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("transition-[opacity,transform] duration-700 ease-[var(--ease-soft)] will-change-[opacity,transform]", shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0", className)}
    >
      {children}
    </Comp>
  );
}

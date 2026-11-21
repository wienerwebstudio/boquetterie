"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/format";

type Connection = { saveData?: boolean; effectiveType?: string };

/**
 * Decorative ambient loop over the hero still. It is mounted only after the
 * page has finished loading, so the 1 MB clip never competes with the LCP image,
 * and not at all for reduced motion, data saver or slow connections – the still
 * underneath is the complete hero on its own.
 */
export function HeroVideo({ src, className }: { src: string; className?: string }) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const conn = (navigator as Navigator & { connection?: Connection }).connection;
    if (conn?.saveData || (conn?.effectiveType && /(^|-)(2g|3g)$/.test(conn.effectiveType))) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => { timer = setTimeout(() => setShow(true), 600); };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!show) return null;
  return (
    <video
      className={cn("transition-opacity duration-700", ready ? "opacity-100" : "opacity-0", className)}
      autoPlay muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1}
      onCanPlay={() => setReady(true)}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

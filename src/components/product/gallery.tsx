"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/types";
import { cn } from "@/lib/format";

const KIND_LABEL: Record<ProductImage["kind"], string> = {
  front: "Vorderansicht", detail: "Detail", size: "Größenvergleich", packaging: "Verpackung", lifestyle: "Ambiente",
};

/**
 * Product gallery. Desktop: thumbnail rail + large 4:5 image. Mobile: snap-scroll carousel with dots.
 * If the selected size carries its own image it is appended and shown.
 */
export function ProductGallery({ images, name, sizeImage, sizeLabel, className }: {
  images: ProductImage[]; name: string; sizeImage?: string; sizeLabel?: string; className?: string;
}) {
  const all = useMemo<ProductImage[]>(() => {
    if (sizeImage && !images.some((i) => i.src === sizeImage)) {
      return [...images, { src: sizeImage, alt: `${name} – Größe ${sizeLabel ?? ""}`.trim(), kind: "size" }];
    }
    return images;
  }, [images, sizeImage, sizeLabel, name]);

  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);
  const current = all[Math.min(index, all.length - 1)];

  // Switch to the size image when the size changes.
  useEffect(() => {
    if (!sizeImage) return;
    const i = all.findIndex((img) => img.src === sizeImage);
    if (i >= 0) setIndex(i);
  }, [sizeImage, all]);

  // Keep the mobile carousel in sync with the index.
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 2) return;
    programmatic.current = true;
    el.scrollTo({ left: target, behavior: "smooth" });
    const t = setTimeout(() => { programmatic.current = false; }, 500);
    return () => clearTimeout(t);
  }, [index]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el || programmatic.current || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index && i >= 0 && i < all.length) setIndex(i);
  }, [index, all.length]);

  const go = (delta: number) => setIndex((i) => (i + delta + all.length) % all.length);

  const onThumbKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setIndex((i + 1) % all.length); focusThumb((i + 1) % all.length); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setIndex((i - 1 + all.length) % all.length); focusThumb((i - 1 + all.length) % all.length); }
  };
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusThumb = (i: number) => thumbRefs.current[i]?.focus();

  return (
    <div className={cn("", className)}>
      <p className="sr-only" aria-live="polite">Bild {index + 1} von {all.length}: {current.alt}</p>

      {/* Mobile carousel */}
      <div className="lg:hidden">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="-mx-5 flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-none sm:-mx-8 sm:rounded-md"
          aria-roledescription="Karussell"
          aria-label={`Bilder von ${name}`}
        >
          {all.map((img, i) => (
            <div key={img.src} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-ivory-200" role="group" aria-roledescription="Bild" aria-label={`${i + 1} von ${all.length}`}>
              <Image src={img.src} alt={img.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2" role="tablist" aria-label="Bild auswählen">
          {all.map((img, i) => (
            <button
              key={img.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${KIND_LABEL[img.kind]} anzeigen`}
              onClick={() => setIndex(i)}
              className="grid size-8 place-items-center"
            >
              <span className={cn("block h-1.5 rounded-full transition-all duration-300", i === index ? "w-6 bg-forest" : "w-1.5 bg-stone")} />
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: rail + main */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[76px_minmax(0,1fr)] xl:gap-5">
        <div className="flex flex-col gap-3" role="tablist" aria-orientation="vertical" aria-label="Bild auswählen">
          {all.map((img, i) => (
            <button
              key={img.src}
              type="button"
              role="tab"
              ref={(el) => { thumbRefs.current[i] = el; }}
              tabIndex={i === index ? 0 : -1}
              aria-selected={i === index}
              aria-label={`${KIND_LABEL[img.kind]}: ${img.alt}`}
              onClick={() => setIndex(i)}
              onKeyDown={(e) => onThumbKey(e, i)}
              className={cn(
                "relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-ivory-200 transition-all duration-300",
                i === index ? "ring-1 ring-forest ring-offset-2 ring-offset-ivory" : "opacity-70 hover:opacity-100",
              )}
            >
              <Image src={img.src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
        <div className="group relative aspect-[4/5] overflow-hidden rounded-md bg-ivory-200">
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt}
            fill
            priority
            sizes="(min-width: 1440px) 780px, (min-width: 1024px) 55vw, 100vw"
            className="object-cover animate-fade-in"
          />
          <span className="pointer-events-none absolute left-4 top-4 rounded-sm bg-ivory/85 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted backdrop-blur">
            {KIND_LABEL[current.kind]}
          </span>
          {all.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Vorheriges Bild" className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ivory/90 text-ink opacity-0 shadow-soft backdrop-blur transition-opacity hover:bg-white focus-visible:opacity-100 group-hover:opacity-100">
                <ChevronLeft className="size-5" strokeWidth={1.6} />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Nächstes Bild" className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ivory/90 text-ink opacity-0 shadow-soft backdrop-blur transition-opacity hover:bg-white focus-visible:opacity-100 group-hover:opacity-100">
                <ChevronRight className="size-5" strokeWidth={1.6} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

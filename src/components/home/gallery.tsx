import Image from "next/image";
import type { HomepageContent } from "@/types";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/format";

/**
 * Asymmetric editorial grid: the first image spans 2x2 on tablet and up.
 * Mobile: two columns, first image full width.
 */
export function Gallery({ content }: { content: HomepageContent["gallery"] }) {
  const images = content.images.slice(0, 6);
  if (!images.length) return null;
  return (
    <section id="galerie" aria-labelledby="gallery-title" className="bg-ivory-100 py-16 sm:py-20 lg:py-28">
      <div className="container-x">
        <div className="mb-10 flex flex-col gap-3 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-3">Galerie</p>
            <h2 id="gallery-title" className="display-2 text-balance text-ink">{content.headline}</h2>
          </div>
        </div>
        <Reveal>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5">
            {images.map((img, i) => (
              <li key={img.src} className={cn("relative overflow-hidden rounded-md bg-ivory-200", i === 0 ? "col-span-2 aspect-[4/3] sm:row-span-2 sm:aspect-auto" : "aspect-square")}>
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes={i === 0 ? "(min-width: 1440px) 880px, (min-width: 640px) 66vw, 100vw" : "(min-width: 1440px) 430px, (min-width: 640px) 33vw, 50vw"}
                  className="object-cover transition-transform duration-700 ease-[var(--ease-soft)] hover:scale-[1.03]"
                />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

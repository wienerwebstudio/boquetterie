"use client";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatPrice, cn } from "@/lib/format";
import { primaryImage, hoverImage, productBadges, lowestPrice } from "@/lib/catalog";
import { routes } from "@/lib/urls";
import { useFavorites } from "@/store/favorites";
import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};
const useMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false);

export function ProductCard({ product, priority = false, showSameDay = false, className, sizesAttr = "(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 90vw" }: {
  product: Product; priority?: boolean; showSameDay?: boolean; className?: string; sizesAttr?: string;
}) {
  const main = primaryImage(product);
  const hover = hoverImage(product);
  const badges = productBadges(product);
  const mounted = useMounted();
  const fav = useFavorites((s) => s.slugs.includes(product.slug));
  const toggle = useFavorites((s) => s.toggle);
  const href = routes.product(product.slug);

  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-ivory-200">
        <Link href={href} className="absolute inset-0" aria-label={`${product.name} ansehen`}>
          <Image
            src={main.src} alt={main.alt} fill priority={priority} sizes={sizesAttr}
            className={cn("object-cover transition-all duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.04]", hover && "group-hover:opacity-0")}
          />
          {hover && (
            <Image src={hover.src} alt="" fill sizes={sizesAttr} className="object-cover opacity-0 transition-all duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.04] group-hover:opacity-100" aria-hidden />
          )}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {badges.slice(0, 1).map((b) => (
            <Badge key={b.kind} tone={b.kind === "bestseller" ? "forest" : b.kind === "new" ? "rose" : "sand"}>{b.label}</Badge>
          ))}
          {showSameDay && product.sameDayCapable && <Badge tone="success">Heute lieferbar</Badge>}
        </div>
        <button
          type="button"
          onClick={() => toggle(product.slug)}
          aria-pressed={mounted && fav}
          aria-label={mounted && fav ? `${product.name} aus Favoriten entfernen` : `${product.name} zu Favoriten hinzufügen`}
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-white/85 text-ink shadow-soft backdrop-blur transition-all hover:scale-105 hover:text-burgundy"
        >
          <Heart className={cn("size-4 transition-colors", mounted && fav && "fill-burgundy text-burgundy")} strokeWidth={1.6} />
        </button>
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-2 opacity-0 transition-all duration-300 ease-[var(--ease-soft)] group-hover:translate-y-0 group-hover:opacity-100 md:block">
          <Link href={href} className="flex h-11 items-center justify-center rounded-md bg-ivory/95 text-sm font-semibold text-forest shadow-soft backdrop-blur hover:bg-white">Auswählen</Link>
        </div>
      </div>
      <div className="mt-3.5 flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-[22px] leading-tight text-ink"><Link href={href}>{product.name}</Link></h3>
          <p className="shrink-0 text-[14px] tabular-nums text-ink"><span className="text-[12px] text-ink-muted">ab </span><span className="font-semibold">{formatPrice(lowestPrice(product))}</span></p>
        </div>
        <p className="line-clamp-1 text-[13.5px] text-ink-muted">{product.tagline}</p>
        <p className="mt-0.5 text-[12px] tracking-[0.04em] text-ink-soft">{product.sizes.map((s) => s.label).join(" · ")}</p>
        <Link href={href} className="mt-2 inline-flex h-10 items-center justify-center rounded-md border border-line text-[13px] font-semibold text-forest transition-colors hover:border-forest md:hidden">Auswählen</Link>
      </div>
    </article>
  );
}

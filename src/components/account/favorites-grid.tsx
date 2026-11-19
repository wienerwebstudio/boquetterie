"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import type { Product } from "@/types";
import { ProductCard } from "@/components/shop/product-card";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/store/favorites";
import { routes } from "@/lib/urls";
import { useI18n } from "@/i18n/client";

/** What `/api/products?slugs=` returns – long texts and SEO data are stripped. */
type ProductCardData = Omit<Product, "description" | "care" | "seo">;

function toProduct(p: ProductCardData): Product {
  return { ...p, description: "", care: [], seo: { title: p.name, description: p.shortDescription } };
}

const noop = () => () => {};
/** false during SSR and hydration, true afterwards – avoids a mismatch with the persisted favorites. */
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

export function FavoritesGrid() {
  const hydrated = useHydrated();
  const slugs = useFavorites((s) => s.slugs);
  const key = slugs.join(",");
  const [loaded, setLoaded] = useState<{ key: string; products: Product[] | null; error?: string } | null>(null);
  const { m, locale } = useI18n();
  const t = m.account.favorites;

  useEffect(() => {
    if (!hydrated || !key) return;
    let alive = true;
    fetch(`/api/products?slugs=${encodeURIComponent(key)}${locale === "de" ? "" : `&locale=${locale}`}`)
      .then((r) => r.json() as Promise<{ ok: boolean; products: ProductCardData[] }>)
      .then((d) => { if (alive) setLoaded({ key, products: d.ok ? d.products.map(toProduct) : [] }); })
      .catch(() => { if (alive) setLoaded({ key, products: null, error: t.loadFailed }); });
    return () => { alive = false; };
  }, [key, hydrated, t, locale]);

  const current = loaded?.key === key ? loaded : null;
  const products = !hydrated ? null : key === "" ? [] : current?.products ?? null;

  if (current?.error) return <p role="alert" className="text-[14px] text-danger">{current.error}</p>;

  if (products === null) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: hydrated ? Math.max(1, Math.min(slugs.length, 4)) : 2 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone p-8 text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-ivory-200 text-burgundy"><Heart className="size-5" strokeWidth={1.5} aria-hidden /></span>
        <p className="font-serif text-2xl text-ink">{t.emptyTitle}</p>
        <p className="mt-2 text-[14px] text-ink-muted">{t.emptyText}</p>
        <Button href={routes.shop} variant="outline" className="mt-6">{t.cta}</Button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => <ProductCard key={p.slug} product={p} />)}
    </div>
  );
}

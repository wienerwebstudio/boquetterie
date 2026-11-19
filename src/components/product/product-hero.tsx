"use client";
import { useState } from "react";
import type { Extra, Product, ProductColorOption, ProductSize, SiteSettings } from "@/types";
import { ProductGallery, type GalleryFocus } from "./gallery";
import { ProductConfigurator } from "./configurator";
import { PricePendingPanel } from "./price-pending";
import { defaultSize } from "@/lib/cart-helpers";
import { useI18n } from "@/i18n/client";

/** Gallery + configurator. Holds the selected size so the gallery can show a size-specific image. */
export function ProductHero({ product, extras, greetingCard }: { product: Product; extras: Extra[]; greetingCard: SiteSettings["greetingCard"] }) {
  const { m, fmt } = useI18n();
  const t = m.product.gallery;
  const [size, setSize] = useState<ProductSize>(() => defaultSize(product));
  const [color, setColor] = useState<ProductColorOption | null>(null);
  // The chosen colour's photo wins over the size photo; a size shows only its own photos.
  const focus: GalleryFocus | null = color?.image
    ? { images: [{ src: color.image, alt: fmt(t.colorAlt, { name: product.name, color: color.label }), kind: "front" }], labels: [fmt(t.colorLabel, { color: color.label })], only: false }
    : size.image
      ? {
          images: [
            { src: size.image, alt: fmt(t.sizeAlt, { name: product.name, size: size.label }), kind: "size" },
            ...(size.detailImage ? [{ src: size.detailImage, alt: size.detailAlt || fmt(t.sizeDetailAlt, { name: product.name, size: size.label }), kind: "detail" as const }] : []),
          ],
          labels: [fmt(t.sizeLabel, { size: size.label }), fmt(size.detailAlt ? t.sizeLabel : t.sizeDetailLabel, { size: size.label })],
          only: true,
        }
      : null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14 xl:gap-20">
      <ProductGallery images={product.images} name={product.name} focus={focus} />
      <div className="lg:sticky lg:top-28 lg:self-start">
        {product.pricePending ? (
          <PricePendingPanel product={product} />
        ) : (
          <ProductConfigurator product={product} extras={extras} greetingCard={greetingCard} onSizeChange={setSize} onColorChange={setColor} />
        )}
      </div>
    </div>
  );
}

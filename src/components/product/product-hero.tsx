"use client";
import { useState } from "react";
import type { Extra, Product, ProductColorOption, ProductSize, SiteSettings } from "@/types";
import { ProductGallery, type GalleryFocus } from "./gallery";
import { ProductConfigurator } from "./configurator";
import { PricePendingPanel } from "./price-pending";
import { defaultSize } from "@/lib/cart-helpers";

/** Gallery + configurator. Holds the selected size so the gallery can show a size-specific image. */
export function ProductHero({ product, extras, greetingCard }: { product: Product; extras: Extra[]; greetingCard: SiteSettings["greetingCard"] }) {
  const [size, setSize] = useState<ProductSize>(() => defaultSize(product));
  const [color, setColor] = useState<ProductColorOption | null>(null);
  // The chosen colour's photo wins over the size photo; a size shows only its own photos.
  const focus: GalleryFocus | null = color?.image
    ? { images: [{ src: color.image, alt: `${product.name} in ${color.label}`, kind: "front" }], labels: [`Farbe ${color.label}`], only: false }
    : size.image
      ? {
          images: [
            { src: size.image, alt: `${product.name} in Größe ${size.label}`, kind: "size" },
            ...(size.detailImage ? [{ src: size.detailImage, alt: size.detailAlt || `${product.name} in Größe ${size.label}, Nahaufnahme`, kind: "detail" as const }] : []),
          ],
          labels: [`Größe ${size.label}`, size.detailAlt ? `Größe ${size.label}` : `Größe ${size.label} · Nahaufnahme`],
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

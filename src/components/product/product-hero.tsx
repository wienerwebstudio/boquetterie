"use client";
import { useState } from "react";
import type { Extra, Product, ProductSize, SiteSettings } from "@/types";
import { ProductGallery } from "./gallery";
import { ProductConfigurator } from "./configurator";
import { defaultSize } from "@/lib/cart-helpers";

/** Gallery + configurator. Holds the selected size so the gallery can show a size-specific image. */
export function ProductHero({ product, extras, greetingCard }: { product: Product; extras: Extra[]; greetingCard: SiteSettings["greetingCard"] }) {
  const [size, setSize] = useState<ProductSize>(() => defaultSize(product));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14 xl:gap-20">
      <ProductGallery images={product.images} name={product.name} sizeImage={size.image} sizeLabel={size.label} />
      <div className="lg:sticky lg:top-28 lg:self-start">
        <ProductConfigurator product={product} extras={extras} greetingCard={greetingCard} onSizeChange={setSize} />
      </div>
    </div>
  );
}

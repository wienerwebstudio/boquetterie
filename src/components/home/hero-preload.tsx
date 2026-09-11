"use client";
import { preload } from "react-dom";

export interface PreloadItem { href: string; srcSet: string; sizes: string; media: string }

/**
 * Emits media-scoped <link rel="preload" as="image"> tags for the art-directed hero image
 * during SSR (same mechanism next/image uses for its `preload` prop). Renders nothing.
 */
export function HeroPreload({ items }: { items: PreloadItem[] }) {
  for (const it of items) {
    preload(it.href, { as: "image", imageSrcSet: it.srcSet, imageSizes: it.sizes, media: it.media, fetchPriority: "high" });
  }
  return null;
}

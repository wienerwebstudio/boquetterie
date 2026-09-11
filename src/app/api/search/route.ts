import { NextResponse } from "next/server";
import { getAllProducts, getCategories, getOccasions } from "@/lib/cms";
import { primaryImage, search, sortProducts } from "@/lib/catalog";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

export interface SearchProductHit {
  slug: string;
  name: string;
  tagline: string;
  basePrice: number;
  sameDayCapable: boolean;
  image: { src: string; alt: string };
}
export interface SearchResponse {
  query: string;
  products: SearchProductHit[];
  occasions: { slug: string; name: string; image: string }[];
  categories: { slug: string; name: string }[];
  /** Only for an empty query: typed suggestions the overlay can offer. */
  suggestions?: string[];
}

const SUGGESTIONS = ["Mama", "Rosen", "Geburtstag", "Weiß", "Danke", "Pastell", "Heute"];

function hit(p: Product): SearchProductHit {
  const img = primaryImage(p);
  return { slug: p.slug, name: p.name, tagline: p.tagline, basePrice: p.basePrice, sameDayCapable: p.sameDayCapable, image: { src: img.src, alt: img.alt } };
}

/**
 * GET /api/search?q=mama[&limit=6]
 * Instant search backing the overlay. An empty query returns quick links
 * (featured occasions, collections, bestsellers) so the overlay is content-driven.
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { scope: "search", limit: 120, windowMs: 60 * 1000 });
  if (limited) return limited;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 6, 1), 24);
  const [products, occasions, categories] = await Promise.all([getAllProducts(), getOccasions(), getCategories()]);

  if (q.length < 2) {
    const body: SearchResponse = {
      query: q,
      products: sortProducts(products.filter((p) => p.bestseller), "bestseller").slice(0, 4).map(hit),
      occasions: occasions.filter((o) => o.featured).slice(0, 5).map((o) => ({ slug: o.slug, name: o.name, image: o.image })),
      categories: categories.filter((c) => c.showInNav && c.slug !== "alle").slice(0, 6).map((c) => ({ slug: c.slug, name: c.name })),
      suggestions: SUGGESTIONS,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  }

  const result = search(q, products, occasions, categories, limit);
  const body: SearchResponse = {
    query: q,
    products: result.products.map(hit),
    occasions: result.occasions.map((o) => ({ slug: o.slug, name: o.name, image: o.image })),
    categories: result.categories.map((c) => ({ slug: c.slug, name: c.name })),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

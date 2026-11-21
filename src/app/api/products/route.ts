import { NextResponse } from "next/server";
import type { Product } from "@/types";
import { getProductsIn } from "@/lib/cms-localized";
import { isLocale } from "@/i18n/config";

import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** The subset of a product that listing cards need. Long texts and SEO data are stripped. */
type ProductCardData = Omit<Product, "description" | "care" | "seo">;

function toCardData(p: Product): ProductCardData {
  const { description: _description, care: _care, seo: _seo, ...rest } = p;
  void _description; void _care; void _seo;
  return rest;
}

/**
 * GET /api/products?slugs=amour,ivory
 * Light product data for client-side lists (favorites). Unknown slugs are skipped,
 * order follows the request. Without `slugs` the whole active catalog is returned.
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { scope: "products", limit: 120, windowMs: 60 * 1000 });
  if (limited) return limited;
  const url = new URL(req.url);
  const raw = url.searchParams.get("slugs");
  const slugs = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100) : null;
  const lang = url.searchParams.get("locale");
  const all = await getProductsIn(isLocale(lang) ? lang : "de");
  const products = slugs ? slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p)) : all;
  return NextResponse.json({ ok: true, products: products.map(toCardData) });
}

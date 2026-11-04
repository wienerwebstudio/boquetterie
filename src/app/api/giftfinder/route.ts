import { NextResponse } from "next/server";
import { getAllProducts, getOccasions } from "@/lib/cms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { findGifts, isComplete, parseGiftFinderQuery } from "@/components/giftfinder/scoring";

export const dynamic = "force-dynamic";

/**
 * GET /api/giftfinder?for=&occasion=&budget=
 * Returns the top matching products (see src/components/giftfinder/scoring.ts).
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { scope: "giftfinder", limit: 60, windowMs: 60 * 1000 });
  if (limited) return limited;

  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const [occasions, products] = await Promise.all([getOccasions(), getAllProducts()]);
  const query = parseGiftFinderQuery(params, occasions);

  if (!isComplete(query)) {
    return NextResponse.json({ ok: false, message: "Bitte wähle Empfänger:in, Anlass und Budget.", query }, { status: 400 });
  }

  const result = findGifts(products, query);
  const occasion = occasions.find((o) => o.slug === query.occasion);
  return NextResponse.json(
    { ok: true, query, occasion: occasion ? { slug: occasion.slug, name: occasion.name } : null, ...result },
    { headers: { "cache-control": "private, max-age=60" } },
  );
}

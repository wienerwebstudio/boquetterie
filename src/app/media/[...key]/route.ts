import { enforceRateLimit } from "@/lib/rate-limit";
import { isServableMediaKey, readStoredMedia } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /media/<key> – serves uploaded images that are not plain files in `public/`:
 * Netlify Blobs (admin uploads and review photos on Netlify) and, with the local
 * driver, review photos from `public/uploads/reviews/…` (`next start` only serves
 * files that existed in `public/` at startup).
 *
 * Keys carry a content hash, so responses are immutable and cached for a year
 * (browser and CDN). next/image loads these URLs like any local image.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const limited = enforceRateLimit(req, { scope: "media", limit: 600, windowMs: 60 * 1000 });
  if (limited) return limited;

  const { key: parts } = await params;
  const key = parts.join("/");
  if (!isServableMediaKey(key)) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  try {
    const file = await readStoredMedia(key);
    if (!file) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    return new Response(new Blob([file.data as Uint8Array<ArrayBuffer>], { type: file.contentType }), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.data.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[media] read failed", key, err);
    return new Response("Error", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

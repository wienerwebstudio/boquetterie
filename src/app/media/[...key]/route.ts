import { enforceRateLimit } from "@/lib/rate-limit";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { clampRange, parseRange, REVIEW_VIDEO_EXT, REVIEW_VIDEO_KEY_RE } from "@/lib/review-video";
import { isServableMediaKey, readReviewVideoChunk, readReviewVideoManifest, readReviewVideoRange, readStoredMedia } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
const notFound = () => new Response("Not found", { status: 404, headers: NO_STORE });

/**
 * GET /media/<key> – serves uploaded images that are not plain files in `public/`:
 * Netlify Blobs (admin uploads and review photos on Netlify) and, with the local
 * driver, review photos from `public/uploads/reviews/…` (`next start` only serves
 * files that existed in `public/` at startup).
 *
 * Keys carry a content hash, so responses are immutable and cached for a year
 * (browser and CDN). next/image loads these URLs like any local image.
 *
 * Customer review videos (`review-videos/<id>/video.<ext>`) are stored in chunks and
 * answered with HTTP Range support (Safari plays nothing without it) – see `serveReviewVideo`.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const limited = enforceRateLimit(req, { scope: "media", limit: 600, windowMs: 60 * 1000 });
  if (limited) return limited;

  const { key: parts } = await params;
  const key = parts.join("/");
  if (REVIEW_VIDEO_KEY_RE.test(key)) return serveReviewVideo(req, key);
  if (!isServableMediaKey(key)) return notFound();

  try {
    const file = await readStoredMedia(key);
    if (!file) return notFound();
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
    return new Response("Error", { status: 500, headers: NO_STORE });
  }
}

/**
 * A review video, read from its chunks:
 *  - only once an admin accepted it (`approved`); before that only for a logged-in admin
 *  - `Range: bytes=a-b` → 206 with at most one chunk's worth of bytes (players follow
 *    `Content-Range` and ask for the rest), `bytes=0-1` probes from Safari included
 *  - no Range → 200, streamed chunk by chunk
 * Public, approved videos are cached by the browser; 206 answers are `private` so no
 * shared cache can mix up ranges.
 */
async function serveReviewVideo(req: Request, key: string) {
  const [, id, ext] = REVIEW_VIDEO_KEY_RE.exec(key) ?? [];
  try {
    const manifest = await readReviewVideoManifest(id);
    if (!manifest || REVIEW_VIDEO_EXT[manifest.type] !== ext || manifest.status === "uploading") return notFound();
    const isPublic = manifest.status === "approved";
    if (!isPublic && !(await isAdminAuthenticated())) return notFound();

    const total = manifest.size;
    const base: Record<string, string> = {
      "Content-Type": manifest.type,
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
    };
    const range = parseRange(req.headers.get("range"), total);
    if (range === "unsatisfiable") {
      return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${total}`, ...NO_STORE } });
    }
    if (range) {
      const clamped = clampRange(range);
      const data = await readReviewVideoRange(manifest, clamped);
      if (!data) return notFound();
      return new Response(new Blob([data as Uint8Array<ArrayBuffer>], { type: manifest.type }), {
        status: 206,
        headers: {
          ...base,
          "Content-Range": `bytes ${clamped.start}-${clamped.end}/${total}`,
          "Content-Length": String(data.byteLength),
          "Cache-Control": isPublic ? "private, max-age=31536000, immutable" : "private, no-store",
        },
      });
    }

    let index = 0;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (index >= manifest.chunks) return controller.close();
        const chunk = await readReviewVideoChunk(manifest, index++);
        if (!chunk) return controller.error(new Error(`chunk ${index - 1} missing`));
        controller.enqueue(chunk);
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        ...base,
        "Content-Length": String(total),
        "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
      },
    });
  } catch (err) {
    console.error("[media] video read failed", key, err);
    return new Response("Error", { status: 500, headers: NO_STORE });
  }
}

import { NextResponse } from "next/server";
import type { Order } from "@/types";
import { getAllProducts, getOrderById } from "@/lib/cms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { tokenMatches } from "@/lib/mail/reminders";
import { hasSubmittedReview } from "@/lib/mail/review-requests";
import { REVIEW_VIDEO_CHUNK_BYTES, REVIEW_VIDEO_ID_RE, videoStartError, type ReviewVideoType } from "@/lib/review-video";
import {
  createReviewVideoUpload,
  deleteReviewPhoto,
  deleteReviewVideo,
  firstMissingReviewVideoChunk,
  processReviewPhoto,
  readReviewVideoManifest,
  storeReviewPhoto,
  storeReviewVideoChunk,
  UploadError,
  writeReviewVideoManifest,
  type ReviewVideoManifest,
} from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Chunked upload of one short customer video for a review (Netlify Functions accept
 * at most ~6 MB per request, so the browser sends the file in pieces of ≤ 4 MB):
 *
 *  1. POST   application/json { order, token, size, type, duration }   → { upload, chunkSize, chunks }
 *  2. PUT    ?upload=<id>&index=<n>  body = raw bytes of chunk n       (headers x-review-order / x-review-token)
 *  3. POST   multipart { order, token, upload, poster (JPEG) }          → { video: { id, url, posterUrl, … } }
 *  4. POST   /api/reviews with `video=<id>` attaches it to the review.
 *  DELETE   ?upload=<id> (same headers) drops an upload that is not attached yet.
 *
 * Every step is rate-limited first, then bound to the order token (delivered, not yet
 * reviewed) and to the upload id. Sizes, the type and the magic bytes are checked on
 * the server; the duration (≤ 15.5 s) is measured by the browser and recorded.
 * The video is only playable for others after an admin accepts it.
 */

const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status });
const fail = (status: number, message: string) => json(status, { ok: false, message });

/** Order + token check shared by every step. */
async function authorize(orderId: string, token: string): Promise<{ order: Order } | { error: Response }> {
  const order = orderId ? await getOrderById(orderId.trim().toUpperCase().slice(0, 20)) : null;
  if (!order || !tokenMatches(order.token, token.slice(0, 64))) return { error: fail(404, "Der Link ist ungültig oder abgelaufen.") };
  if (order.status !== "delivered") return { error: fail(409, "Eine Bewertung ist erst nach der Zustellung möglich.") };
  if (await hasSubmittedReview(order.id)) return { error: fail(409, "Für diese Bestellung wurde bereits eine Bewertung abgegeben. Danke!") };
  return { order };
}

async function loadManifest(id: string, order: Order): Promise<ReviewVideoManifest | null> {
  if (!REVIEW_VIDEO_ID_RE.test(id)) return null;
  const manifest = await readReviewVideoManifest(id);
  return manifest && manifest.orderId === order.id ? manifest : null;
}

function uploadErrorResponse(err: unknown, fallback: string) {
  if (err instanceof UploadError) return fail(err.status, err.message);
  console.error("[reviews/video]", fallback, err);
  return fail(500, fallback);
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.startsWith("multipart/form-data")) return finish(req);

  const limited = enforceRateLimit(req, { scope: "review-video-start", limit: 10, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail(400, "Ungültige Anfrage.");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, "Ungültige Anfrage.");
  }
  const input = { size: Number(body.size), type: String(body.type ?? ""), duration: Number(body.duration) };
  const error = videoStartError(input);
  if (error) return json(422, { ok: false, errors: { video: error }, message: error });

  const auth = await authorize(String(body.order ?? ""), String(body.token ?? ""));
  if ("error" in auth) return auth.error;
  try {
    const manifest = await createReviewVideoUpload({ orderId: auth.order.id, type: input.type as ReviewVideoType, size: input.size, duration: input.duration });
    return json(201, { ok: true, upload: manifest.id, chunkSize: manifest.chunkSize, chunks: manifest.chunks });
  } catch (err) {
    return uploadErrorResponse(err, "Das Video konnte gerade nicht hochgeladen werden.");
  }
}

/** One chunk as raw bytes. */
export async function PUT(req: Request) {
  const limited = enforceRateLimit(req, { scope: "review-video-chunk", limit: 120, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const url = new URL(req.url);
  const id = url.searchParams.get("upload") ?? "";
  const index = Number(url.searchParams.get("index"));
  if (!REVIEW_VIDEO_ID_RE.test(id) || !Number.isInteger(index) || index < 0) return fail(400, "Ungültige Anfrage.");
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > REVIEW_VIDEO_CHUNK_BYTES) return fail(413, "Ein Teil des Videos ist zu groß.");

  const auth = await authorize(req.headers.get("x-review-order") ?? "", req.headers.get("x-review-token") ?? "");
  if ("error" in auth) return auth.error;
  const manifest = await loadManifest(id, auth.order);
  if (!manifest) return fail(404, "Upload nicht gefunden.");
  if (manifest.status !== "uploading") return fail(409, "Dieses Video ist bereits vollständig hochgeladen.");

  let data: Buffer;
  try {
    data = Buffer.from(await req.arrayBuffer());
  } catch {
    return fail(400, "Ungültige Anfrage.");
  }
  if (data.length > REVIEW_VIDEO_CHUNK_BYTES) return fail(413, "Ein Teil des Videos ist zu groß.");
  try {
    await storeReviewVideoChunk(manifest, index, data);
    return json(200, { ok: true });
  } catch (err) {
    return uploadErrorResponse(err, "Das Video konnte gerade nicht hochgeladen werden.");
  }
}

/** Last step: every chunk must be there; the poster frame is decoded and stored like a photo. */
async function finish(req: Request) {
  const limited = enforceRateLimit(req, { scope: "review-video-finish", limit: 20, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Ungültige Anfrage.");
  }
  const auth = await authorize(String(form.get("order") ?? ""), String(form.get("token") ?? ""));
  if ("error" in auth) return auth.error;
  const manifest = await loadManifest(String(form.get("upload") ?? ""), auth.order);
  if (!manifest) return fail(404, "Upload nicht gefunden.");
  if (manifest.status === "complete" && manifest.poster) return json(200, { ok: true, upload: manifest.id });
  if (manifest.status !== "uploading") return fail(409, "Dieses Video ist bereits einer Bewertung zugeordnet.");

  const missing = await firstMissingReviewVideoChunk(manifest);
  if (missing >= 0) return json(409, { ok: false, missing, message: "Das Video ist noch nicht vollständig hochgeladen." });

  const poster = form.get("poster");
  if (!poster || typeof poster === "string") return fail(422, "Das Vorschaubild des Videos fehlt.");
  let stored: Awaited<ReturnType<typeof storeReviewPhoto>> | null = null;
  try {
    const processed = await processReviewPhoto(Buffer.from(await poster.arrayBuffer()));
    const products = await getAllProducts(true);
    const slug = products.find((p) => p.id === auth.order.lines[0]?.productId)?.slug ?? "kundenvideo";
    stored = await storeReviewPhoto(processed, `${slug}-video`);
    await writeReviewVideoManifest({
      ...manifest,
      status: "complete",
      completedAt: new Date().toISOString(),
      poster: { key: stored.key, url: stored.url, width: stored.width, height: stored.height },
    });
    return json(200, { ok: true, upload: manifest.id });
  } catch (err) {
    if (stored) await deleteReviewPhoto(stored.key).catch(() => undefined);
    return uploadErrorResponse(err, "Das Video konnte gerade nicht gespeichert werden.");
  }
}

/** Drops an upload that is not attached to a review yet (customer removed the video). */
export async function DELETE(req: Request) {
  const limited = enforceRateLimit(req, { scope: "review-video-delete", limit: 20, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;
  const id = new URL(req.url).searchParams.get("upload") ?? "";
  if (!REVIEW_VIDEO_ID_RE.test(id)) return fail(400, "Ungültige Anfrage.");
  const auth = await authorize(req.headers.get("x-review-order") ?? "", req.headers.get("x-review-token") ?? "");
  if ("error" in auth) return auth.error;
  const manifest = await loadManifest(id, auth.order);
  if (!manifest) return json(200, { ok: true });
  if (manifest.status !== "uploading" && manifest.status !== "complete") return fail(409, "Dieses Video ist bereits einer Bewertung zugeordnet.");
  try {
    await deleteReviewVideo(id);
    return json(200, { ok: true });
  } catch (err) {
    return uploadErrorResponse(err, "Das Video konnte gerade nicht gelöscht werden.");
  }
}

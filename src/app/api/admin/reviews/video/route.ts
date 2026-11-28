import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/cms";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { REVIEW_VIDEO_CHUNK_BYTES, REVIEW_VIDEO_ID_RE, videoStartError, type ReviewVideoType } from "@/lib/review-video";
import {
  createReviewVideoUpload,
  deleteReviewPhoto,
  deleteReviewVideo,
  firstMissingReviewVideoChunk,
  processReviewPhoto,
  readReviewVideoManifest,
  reviewVideoUrl,
  storeReviewPhoto,
  storeReviewVideoChunk,
  UploadError,
  writeReviewVideoManifest,
  type ReviewVideoManifest,
} from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** `orderId` of every manifest uploaded here (no order behind it). */
const ADMIN_VIDEO_OWNER = "admin";

/**
 * Admin review editor: upload a customer video (e.g. a clip sent via WhatsApp) for a
 * review. Same chunked flow and the same checks as the customer route
 * (`/api/reviews/video`), but bound to the admin session instead of an order token:
 *
 *  1. POST   application/json { size, type, duration }               → { upload, chunkSize, chunks }
 *  2. PUT    ?upload=<id>&index=<n>  body = raw bytes of chunk n
 *  3. POST   multipart { upload, poster (JPEG), product?, width?, height? }
 *            → { video: { src, poster, duration, width, height } }   (manifest is `approved` = public)
 *  DELETE   ?upload=<id> drops an unfinished admin upload (published videos are kept).
 *
 * Every step: rate limit first, then a valid admin session. The review itself is saved
 * by the form („Speichern“) with the returned fields.
 */

const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status });
const fail = (status: number, message: string) => json(status, { ok: false, message });
const unauthorized = () => fail(401, "Nicht angemeldet.");

async function loadManifest(id: string): Promise<ReviewVideoManifest | null> {
  if (!REVIEW_VIDEO_ID_RE.test(id)) return null;
  const manifest = await readReviewVideoManifest(id);
  return manifest && manifest.orderId === ADMIN_VIDEO_OWNER ? manifest : null;
}

function uploadErrorResponse(err: unknown, fallback: string) {
  if (err instanceof UploadError) return fail(err.status, err.message);
  console.error("[admin/reviews/video]", fallback, err);
  return fail(500, fallback);
}

/** Pixel size sent by the browser (probed from the video); null when missing or implausible. */
function dimension(raw: FormDataEntryValue | null): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n <= 10_000 ? n : null;
}

function publishedVideo(manifest: ReviewVideoManifest, size?: { width: number | null; height: number | null }) {
  const poster = manifest.poster!;
  const useProbed = size?.width && size?.height;
  return {
    src: reviewVideoUrl(manifest),
    poster: poster.url,
    duration: manifest.duration,
    width: useProbed ? size.width : poster.width,
    height: useProbed ? size.height : poster.height,
  };
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.startsWith("multipart/form-data")) return finish(req);

  const limited = enforceRateLimit(req, { scope: "admin-review-video-start", limit: 30, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;
  if (!(await isAdminAuthenticated())) return unauthorized();
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
  try {
    const manifest = await createReviewVideoUpload({ orderId: ADMIN_VIDEO_OWNER, type: input.type as ReviewVideoType, size: input.size, duration: input.duration });
    return json(201, { ok: true, upload: manifest.id, chunkSize: manifest.chunkSize, chunks: manifest.chunks });
  } catch (err) {
    return uploadErrorResponse(err, "Das Video konnte gerade nicht hochgeladen werden.");
  }
}

/** One chunk as raw bytes. */
export async function PUT(req: Request) {
  const limited = enforceRateLimit(req, { scope: "admin-review-video-chunk", limit: 300, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  if (!(await isAdminAuthenticated())) return unauthorized();
  const url = new URL(req.url);
  const id = url.searchParams.get("upload") ?? "";
  const index = Number(url.searchParams.get("index"));
  if (!REVIEW_VIDEO_ID_RE.test(id) || !Number.isInteger(index) || index < 0) return fail(400, "Ungültige Anfrage.");
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > REVIEW_VIDEO_CHUNK_BYTES) return fail(413, "Ein Teil des Videos ist zu groß.");

  const manifest = await loadManifest(id);
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

/** Last step: every chunk must be there; the poster is stored like a review photo and the video is published. */
async function finish(req: Request) {
  const limited = enforceRateLimit(req, { scope: "admin-review-video-finish", limit: 30, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;
  if (!(await isAdminAuthenticated())) return unauthorized();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Ungültige Anfrage.");
  }
  const manifest = await loadManifest(String(form.get("upload") ?? ""));
  if (!manifest) return fail(404, "Upload nicht gefunden.");
  const size = { width: dimension(form.get("width")), height: dimension(form.get("height")) };
  if (manifest.status === "approved" && manifest.poster) return json(200, { ok: true, upload: manifest.id, video: publishedVideo(manifest, size) });
  if (manifest.status !== "uploading") return fail(409, "Dieses Video ist bereits einer Bewertung zugeordnet.");

  const missing = await firstMissingReviewVideoChunk(manifest);
  if (missing >= 0) return json(409, { ok: false, missing, message: "Das Video ist noch nicht vollständig hochgeladen." });

  const poster = form.get("poster");
  if (!poster || typeof poster === "string") return fail(422, "Das Vorschaubild des Videos fehlt.");
  let stored: Awaited<ReturnType<typeof storeReviewPhoto>> | null = null;
  try {
    const processed = await processReviewPhoto(Buffer.from(await poster.arrayBuffer()));
    const productSlug = String(form.get("product") ?? "");
    const products = productSlug ? await getAllProducts(true) : [];
    const slug = products.find((p) => p.slug === productSlug)?.slug ?? "kundenvideo";
    stored = await storeReviewPhoto(processed, `${slug}-video`);
    const published: ReviewVideoManifest = {
      ...manifest,
      status: "approved",
      completedAt: new Date().toISOString(),
      poster: { key: stored.key, url: stored.url, width: stored.width, height: stored.height },
    };
    await writeReviewVideoManifest(published);
    return json(200, { ok: true, upload: manifest.id, video: publishedVideo(published, size) });
  } catch (err) {
    if (stored) await deleteReviewPhoto(stored.key).catch(() => undefined);
    return uploadErrorResponse(err, "Das Video konnte gerade nicht gespeichert werden.");
  }
}

/** Drops an unfinished admin upload (a failed attempt). Published videos stay – reviews may reference them. */
export async function DELETE(req: Request) {
  const limited = enforceRateLimit(req, { scope: "admin-review-video-delete", limit: 60, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;
  if (!(await isAdminAuthenticated())) return unauthorized();
  const id = new URL(req.url).searchParams.get("upload") ?? "";
  if (!REVIEW_VIDEO_ID_RE.test(id)) return fail(400, "Ungültige Anfrage.");
  const manifest = await loadManifest(id);
  if (!manifest) return json(200, { ok: true });
  if (manifest.status !== "uploading" && manifest.status !== "complete") return fail(409, "Dieses Video ist bereits veröffentlicht.");
  try {
    await deleteReviewVideo(id);
    return json(200, { ok: true });
  } catch (err) {
    return uploadErrorResponse(err, "Das Video konnte gerade nicht gelöscht werden.");
  }
}

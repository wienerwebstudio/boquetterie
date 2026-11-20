/**
 * Customer videos in reviews: limits, validation and the byte-range arithmetic of
 * the chunked upload. Pure – no storage, no Node APIs – so the browser form, the
 * API routes, the `/media` route and the unit tests share the same rules.
 *
 * Why chunks: Netlify Functions reject request bodies over ~6 MB (binary bodies are
 * base64-encoded on the way), so a phone video is sent in pieces of at most 4 MB.
 * Every piece is stored as its own object; `/media/review-videos/<id>/video.<ext>`
 * answers HTTP Range requests by mapping the byte range onto those pieces.
 * See docs/UPLOADS.md → „Kundenvideos“.
 */

import type { Review, ReviewVideo } from "@/types";

/** At most one video per review. */
export const MAX_REVIEW_VIDEOS = 1;
/** Longest clip in seconds (the form says 15 s; a little tolerance for container rounding). */
export const MAX_REVIEW_VIDEO_SECONDS = 15;
export const REVIEW_VIDEO_DURATION_TOLERANCE = 0.5;
/** Largest accepted file. */
export const MAX_REVIEW_VIDEO_BYTES = 60 * 1024 * 1024;
/** Size of every chunk but the last (4 MB, i.e. ~5.3 MB base64 – below Netlify's ~6 MB request limit). */
export const REVIEW_VIDEO_CHUNK_BYTES = 4 * 1000 * 1000;
/** Upper bound of chunks per video. */
export const MAX_REVIEW_VIDEO_CHUNKS = Math.ceil(MAX_REVIEW_VIDEO_BYTES / REVIEW_VIDEO_CHUNK_BYTES);
/** Content types the picker offers and the server accepts. */
export const REVIEW_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export type ReviewVideoType = (typeof REVIEW_VIDEO_TYPES)[number];
export const REVIEW_VIDEO_ACCEPT = REVIEW_VIDEO_TYPES.join(",");
/** Largest response body of one Range request (one chunk – keeps Netlify responses small). */
export const MAX_RANGE_RESPONSE_BYTES = REVIEW_VIDEO_CHUNK_BYTES;

export const REVIEW_VIDEO_EXT: Record<ReviewVideoType, "mp4" | "mov" | "webm"> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

/** Upload ids are random: 24 hex characters. */
export const REVIEW_VIDEO_ID_RE = /^[a-f0-9]{24}$/;
/** Public path of a video: `review-videos/<id>/video.<ext>`. */
export const REVIEW_VIDEO_KEY_RE = /^review-videos\/([a-f0-9]{24})\/video\.(mp4|mov|webm)$/;

export function isReviewVideoType(type: string): type is ReviewVideoType {
  return (REVIEW_VIDEO_TYPES as readonly string[]).includes(type);
}

/** Storage keys of one upload (same layout for every driver). */
export function reviewVideoKeys(id: string) {
  const dir = `review-videos/${id}`;
  return {
    manifest: `${dir}/manifest.json`,
    chunk: (index: number) => `${dir}/chunk-${String(index).padStart(3, "0")}`,
    video: (type: ReviewVideoType) => `${dir}/video.${REVIEW_VIDEO_EXT[type]}`,
  };
}

/** Number of chunks for a file of `size` bytes. */
export function chunkCount(size: number, chunkSize = REVIEW_VIDEO_CHUNK_BYTES): number {
  return size > 0 ? Math.ceil(size / chunkSize) : 0;
}

/** Exact size chunk `index` must have (every chunk is full except the last). */
export function expectedChunkSize(size: number, index: number, chunkSize = REVIEW_VIDEO_CHUNK_BYTES): number {
  const count = chunkCount(size, chunkSize);
  if (!Number.isInteger(index) || index < 0 || index >= count) return -1;
  return index < count - 1 ? chunkSize : size - chunkSize * (count - 1);
}

export interface VideoStartInput { size: number; type: string; duration: number }

/**
 * Checks what the browser declares before the upload starts. Returns a German error
 * message (shown to the customer as fallback) or null.
 */
export function videoStartError({ size, type, duration }: VideoStartInput): string | null {
  if (!isReviewVideoType(type)) return "Bitte ein Video als MP4, MOV oder WebM auswählen.";
  if (!Number.isFinite(size) || !Number.isInteger(size) || size <= 0) return "Das Video ist leer.";
  if (size > MAX_REVIEW_VIDEO_BYTES) return "Das Video ist zu groß (maximal 60 MB).";
  if (!Number.isFinite(duration) || duration <= 0) return "Die Länge des Videos konnte nicht gelesen werden.";
  if (duration > MAX_REVIEW_VIDEO_SECONDS + REVIEW_VIDEO_DURATION_TOLERANCE) return `Das Video ist zu lang (maximal ${MAX_REVIEW_VIDEO_SECONDS} Sekunden).`;
  return null;
}

/**
 * Container family by the first bytes: ISO-BMFF (`ftyp` box → MP4, `qt  ` brand → MOV)
 * or EBML/Matroska (WebM). Anything else is null.
 */
export function sniffVideoContainer(head: Uint8Array): "mp4" | "mov" | "webm" | null {
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "webm";
  if (head.length >= 12 && String.fromCharCode(head[4], head[5], head[6], head[7]) === "ftyp") {
    return String.fromCharCode(head[8], head[9], head[10], head[11]) === "qt  " ? "mov" : "mp4";
  }
  return null;
}

/**
 * Whether the first bytes fit the declared content type. MP4 and MOV share the
 * container format (phones label either way), WebM must be EBML.
 */
export function videoMagicMatches(type: ReviewVideoType, head: Uint8Array): boolean {
  const sniffed = sniffVideoContainer(head);
  if (!sniffed) return false;
  return type === "video/webm" ? sniffed === "webm" : sniffed !== "webm";
}

/* ---------------- HTTP Range ---------------- */

export type ByteRange = { start: number; end: number };

/**
 * Parses a single `Range: bytes=…` header against a resource of `total` bytes.
 *  - null: no (usable) Range header → answer 200 with the whole file
 *  - "unsatisfiable": answer 416
 * Multiple ranges are not supported and treated like "no Range" (allowed by RFC 9110).
 */
export function parseRange(header: string | null | undefined, total: number): ByteRange | "unsatisfiable" | null {
  if (!header) return null;
  const m = /^bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(header.trim());
  if (!m) return null;
  const [, a, b] = m;
  if (a === "" && b === "") return null;
  if (total <= 0) return "unsatisfiable";
  if (a === "") {
    // Suffix range: the last N bytes.
    const n = Number(b);
    if (n <= 0) return "unsatisfiable";
    return { start: Math.max(0, total - n), end: total - 1 };
  }
  const start = Number(a);
  if (start >= total) return "unsatisfiable";
  const end = b === "" ? total - 1 : Math.min(Number(b), total - 1);
  if (end < start) return null;
  return { start, end };
}

/**
 * Caps a range to at most `max` bytes. Media players request `bytes=0-` and follow
 * the `Content-Range` they get back, so a shorter answer is fine and keeps every
 * response within one or two chunks.
 */
export function clampRange(range: ByteRange, max = MAX_RANGE_RESPONSE_BYTES): ByteRange {
  return { start: range.start, end: Math.min(range.end, range.start + max - 1) };
}

export interface ChunkSlice {
  /** Chunk number. */
  index: number;
  /** First byte inside the chunk (inclusive). */
  from: number;
  /** Last byte inside the chunk (inclusive). */
  to: number;
}

/** Maps a byte range of the whole file onto the chunks that hold it (in order). */
export function mapRangeToChunks(chunkSizes: readonly number[], range: ByteRange): ChunkSlice[] {
  const slices: ChunkSlice[] = [];
  let offset = 0;
  for (let index = 0; index < chunkSizes.length; index++) {
    const size = chunkSizes[index];
    const first = offset;
    const last = offset + size - 1;
    offset += size;
    if (size <= 0 || last < range.start) continue;
    if (first > range.end) break;
    slices.push({ index, from: Math.max(range.start, first) - first, to: Math.min(range.end, last) - first });
  }
  return slices;
}

/* ---------------- storefront ---------------- */

/** Customer video shown on the site: only for real, verified reviews – never for demo entries. */
export function publicReviewVideo(review: Review): ReviewVideo | null {
  if (review.demo || !review.verified) return null;
  const v = review.video;
  return v && typeof v.src === "string" && v.src.length > 0 && typeof v.poster === "string" ? v : null;
}

/** "0:12" for 12.3 seconds. */
export function formatClipDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

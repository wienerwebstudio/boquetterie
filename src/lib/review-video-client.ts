/**
 * Browser side of the review video: reading duration and size from the file, the
 * poster frame, and the chunked upload to /api/reviews/video (customers) or
 * /api/admin/reviews/video (admin review editor). Client only.
 */

import { isReviewVideoType, type ReviewVideoType } from "@/lib/review-video";

export interface ProbedVideo {
  duration: number;
  width: number;
  height: number;
  /** JPEG of one frame (max. 1280 px), uploaded as the poster. */
  poster: Blob;
}

const POSTER_MAX_SIDE = 1280;
const PROBE_TIMEOUT_MS = 20_000;

/** Content type of a picked file; some browsers leave `type` empty, so the extension decides then. */
export function reviewVideoType(file: File): ReviewVideoType | null {
  if (isReviewVideoType(file.type)) return file.type;
  if (file.type === "video/x-m4v") return "video/mp4";
  if (file.type) return null;
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "mp4" || ext === "m4v") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  return null;
}

function once(el: HTMLVideoElement, event: string, timeout = PROBE_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => done(new Error(`timeout: ${event}`)), timeout);
    const onEvent = () => done();
    const onError = () => done(new Error("video error"));
    function done(err?: Error) {
      window.clearTimeout(timer);
      el.removeEventListener(event, onEvent);
      el.removeEventListener("error", onError);
      if (err) reject(err);
      else resolve();
    }
    el.addEventListener(event, onEvent);
    el.addEventListener("error", onError);
  });
}

/**
 * Loads the file into a hidden <video>, reads duration and size, seeks to a frame
 * near the start and draws it into a canvas. Throws when the browser cannot decode
 * the file (e.g. HEVC on a desktop without HEVC support).
 */
export async function probeReviewVideo(file: Blob): Promise<ProbedVideo> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    const loaded = once(video, "loadedmetadata");
    video.src = url;
    await loaded;
    let duration = video.duration;
    if (!Number.isFinite(duration)) {
      // WebM from MediaRecorder carries no duration – seeking far ahead makes the browser compute it.
      const changed = once(video, "durationchange", 10_000);
      video.currentTime = Number.MAX_SAFE_INTEGER;
      await changed.catch(() => undefined);
      duration = video.duration;
    }
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("no duration");
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) throw new Error("no video track");

    const seeked = once(video, "seeked");
    video.currentTime = Math.min(0.5, duration / 2);
    await seeked;
    if (video.readyState < 2) await once(video, "loadeddata").catch(() => undefined);

    const scale = Math.min(1, POSTER_MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!poster) throw new Error("no poster");
    return { duration, width, height, poster };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export class VideoUploadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "VideoUploadError";
  }
}

async function readError(res: Response): Promise<VideoUploadError> {
  const data = (await res.json().catch(() => null)) as { message?: string } | null;
  return new VideoUploadError(data?.message ?? "", res.status);
}

export interface UploadVideoInput {
  orderId: string;
  token: string;
  file: Blob;
  type: ReviewVideoType;
  duration: number;
  poster: Blob;
  onProgress?: (fraction: number) => void;
}

export interface ChunkedVideoUploadInput {
  /** API route with the start (POST JSON) → chunks (PUT) → finish (POST multipart) → DELETE flow. */
  endpoint: string;
  file: Blob;
  type: ReviewVideoType;
  duration: number;
  /** Extra fields of the start request (e.g. order + token). */
  start?: Record<string, unknown>;
  /** Extra headers of the chunk and delete requests (e.g. the order binding). */
  headers?: Record<string, string>;
  /** Fields of the finish request besides `upload` (e.g. the poster frame). */
  finish: (form: FormData) => void;
  onProgress?: (fraction: number) => void;
}

/**
 * Start → chunks (≤ 4 MB each, sequential, every chunk retried twice) → finish.
 * Shared by the customer form and the admin review editor. Resolves with the upload
 * id and the JSON body of the finish response.
 */
export async function uploadChunkedVideo({ endpoint, file, type, duration, start: startFields, headers: extraHeaders = {}, finish: fillFinish, onProgress }: ChunkedVideoUploadInput): Promise<{ upload: string; result: Record<string, unknown> }> {
  const start = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...startFields, size: file.size, type, duration }),
  });
  if (!start.ok) throw await readError(start);
  const { upload, chunkSize, chunks } = (await start.json()) as { upload: string; chunkSize: number; chunks: number };
  const headers = { "content-type": "application/octet-stream", ...extraHeaders };

  try {
    await sendChunks(upload, chunkSize, chunks);
    const form = new FormData();
    fillFinish(form);
    form.set("upload", upload);
    const finish = await fetch(endpoint, { method: "POST", body: form });
    if (!finish.ok) throw await readError(finish);
    const result = ((await finish.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    return { upload, result };
  } catch (err) {
    // A failed upload is not resumed – drop its chunks; the next attempt starts fresh.
    discardChunkedVideo(endpoint, upload, extraHeaders);
    throw err;
  }

  async function sendChunks(upload: string, chunkSize: number, chunks: number) {
    for (let index = 0; index < chunks; index++) {
      const body = file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize));
      let attempt = 0;
      for (;;) {
        const res = await fetch(`${endpoint}?upload=${encodeURIComponent(upload)}&index=${index}`, { method: "PUT", headers, body }).catch(() => null);
        if (res?.ok) break;
        // Validation errors (4xx except 408/429) will not get better by retrying.
        if (res && res.status < 500 && res.status !== 408 && res.status !== 429) throw await readError(res);
        if (++attempt > 2) throw res ? await readError(res) : new VideoUploadError("", 0);
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
      onProgress?.((index + 1) / chunks);
    }
  }
}

/** Customer review form: the upload is bound to the order token. Resolves with the upload id to send along with the review. */
export async function uploadReviewVideo({ orderId, token, file, type, duration, poster, onProgress }: UploadVideoInput): Promise<string> {
  const { upload } = await uploadChunkedVideo({
    endpoint: "/api/reviews/video",
    file,
    type,
    duration,
    start: { order: orderId, token },
    headers: { "x-review-order": orderId, "x-review-token": token },
    finish: (form) => {
      form.set("order", orderId);
      form.set("token", token);
      form.set("poster", poster, "poster.jpg");
    },
    onProgress,
  });
  return upload;
}

/** Best effort: drops an unfinished upload. */
function discardChunkedVideo(endpoint: string, upload: string, headers: Record<string, string>) {
  void fetch(`${endpoint}?upload=${encodeURIComponent(upload)}`, { method: "DELETE", headers }).catch(() => undefined);
}

/** Best effort: drops an upload that will not be used (the customer removed the video). */
export function discardReviewVideo(orderId: string, token: string, upload: string) {
  discardChunkedVideo("/api/reviews/video", upload, { "x-review-order": orderId, "x-review-token": token });
}

import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

/**
 * Chunked review-video upload end to end on the server side: API steps, storage with
 * all three drivers (local files in a temp dir, a fake Netlify Blobs store, a fake S3
 * client), the `/media` route with HTTP Range, admin gating and deletion.
 */

vi.mock("server-only", () => ({}));

/** The local driver writes below `<cwd>/public/uploads` – point cwd at a temp dir. */
const tmp = vi.hoisted(() => {
  /* eslint-disable @typescript-eslint/no-require-imports -- vi.hoisted runs before the imports */
  const nodeFs = require("node:fs") as typeof import("node:fs");
  const nodeOs = require("node:os") as typeof import("node:os");
  const nodePath = require("node:path") as typeof import("node:path");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "review-video-"));
  process.cwd = () => dir;
  return { dir };
});

const ORDER = vi.hoisted(() => ({
  id: "BQ-VID001",
  token: "abcdef0123456789abcdef01",
  status: "delivered",
  locale: "de",
  history: [{ status: "delivered", at: "2026-11-16T10:00:00.000Z" }],
  customer: { firstName: "Anna", lastName: "Muster", email: "anna@example.com", phone: "" },
  lines: [{ productId: "p-red", productName: "Red Passion" }],
}));

const docs = vi.hoisted(() => new Map<string, unknown>());
vi.mock("@/lib/cms", () => ({
  getOrderById: vi.fn(async (id: string) => (id === ORDER.id ? structuredClone(ORDER) : null)),
  getOrders: vi.fn(async () => [ORDER]),
  updateOrder: vi.fn(async () => null),
  getAllProducts: vi.fn(async () => [{ id: "p-red", slug: "red-passion", name: "Red Passion" }]),
  readData: vi.fn(async (name: string, fallback: unknown) => structuredClone(docs.has(name) ? docs.get(name) : fallback)),
  writeData: vi.fn(async (name: string, value: unknown) => void docs.set(name, structuredClone(value))),
  readCollection: vi.fn(async (name: string) => structuredClone(docs.get(`content:${name}`) ?? [])),
  writeCollection: vi.fn(async (name: string, value: unknown) => void docs.set(`content:${name}`, structuredClone(value))),
}));
vi.mock("@/lib/mail", () => ({ sendReviewRequest: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const admin = vi.hoisted(() => ({ loggedIn: false }));
vi.mock("@/lib/admin-session", () => ({
  isAdminAuthenticated: vi.fn(async () => admin.loggedIn),
  requireAdmin: vi.fn(async () => undefined),
}));

/** Fake Netlify Blobs store. */
const blobs = vi.hoisted(() => {
  const data = new Map<string, { bytes: Uint8Array; metadata: Record<string, unknown> }>();
  const store = {
    set: async (key: string, value: Blob, opts?: { metadata?: Record<string, unknown> }) => {
      data.set(key, { bytes: new Uint8Array(await value.arrayBuffer()), metadata: opts?.metadata ?? {} });
      return { modified: true };
    },
    get: async (key: string) => {
      const e = data.get(key);
      return e ? e.bytes.buffer.slice(e.bytes.byteOffset, e.bytes.byteOffset + e.bytes.byteLength) : null;
    },
    getWithMetadata: async (key: string) => {
      const e = data.get(key);
      return e ? { data: e.bytes.buffer.slice(e.bytes.byteOffset, e.bytes.byteOffset + e.bytes.byteLength), metadata: e.metadata, etag: "x" } : null;
    },
    getMetadata: async (key: string) => (data.has(key) ? { metadata: data.get(key)!.metadata, etag: "x" } : null),
    delete: async (key: string) => void data.delete(key),
  };
  return { data, getStore: vi.fn(() => store) };
});
vi.mock("@netlify/blobs", () => ({ getStore: blobs.getStore }));

/** Fake S3: objects in a map, Range on GetObject, NotFound on HeadObject. */
const s3 = vi.hoisted(() => {
  const objects = new Map<string, Uint8Array>();
  class Command { constructor(readonly input: Record<string, unknown>) {} }
  class PutObjectCommand extends Command {}
  class GetObjectCommand extends Command {}
  class HeadObjectCommand extends Command {}
  class DeleteObjectCommand extends Command {}
  class S3Client {
    async send(cmd: Command) {
      const key = String(cmd.input.Key);
      if (cmd instanceof PutObjectCommand) {
        const body = cmd.input.Body as Buffer;
        objects.set(key, new Uint8Array(body));
        return {};
      }
      if (cmd instanceof DeleteObjectCommand) return void objects.delete(key);
      const obj = objects.get(key);
      if (cmd instanceof HeadObjectCommand) {
        if (!obj) throw Object.assign(new Error("NotFound"), { name: "NotFound" });
        return { ContentLength: obj.byteLength };
      }
      if (!obj) throw Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" });
      const m = /^bytes=(\d+)-(\d+)$/.exec(String(cmd.input.Range ?? ""));
      const bytes = m ? obj.subarray(Number(m[1]), Number(m[2]) + 1) : obj;
      return { Body: { transformToByteArray: async () => bytes } };
    }
  }
  return { objects, module: { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } };
});
vi.mock("@aws-sdk/client-s3", () => s3.module);

import { POST as postVideo, PUT as putChunk, DELETE as deleteUpload } from "@/app/api/reviews/video/route";
import { POST as postReview } from "@/app/api/reviews/route";
import { GET as getMedia } from "@/app/media/[...key]/route";
import { rateLimitInternals } from "@/lib/rate-limit";
import { REVIEW_VIDEO_CHUNK_BYTES } from "@/lib/review-video";
import { deleteReviewVideo, readReviewVideoManifest, writeReviewVideoManifest } from "@/lib/uploads";
import { acceptSubmission, rejectSubmission } from "@/app/admin/bewertungen/eingereicht/actions";
import type { Review } from "@/types";
import type { ReviewSubmission } from "@/types/reminders";

const BASE = "http://localhost:3000";
let ip = 0;
const nextIp = () => `198.51.100.${++ip % 250}`;
const authHeaders = { "x-review-order": ORDER.id, "x-review-token": ORDER.token };

/** A fake MP4: `ftyp` box first, then pseudo-random bytes; 2 full chunks + a short one. */
function fakeMp4(size = 2 * REVIEW_VIDEO_CHUNK_BYTES + 4321) {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) bytes[i] = (i * 31 + (i >> 8)) & 0xff;
  bytes.set([0, 0, 0, 0x20, ...Buffer.from("ftypisom")], 0);
  return bytes;
}

const startReq = (body: Record<string, unknown>) =>
  new Request(`${BASE}/api/reviews/video`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": nextIp() }, body: JSON.stringify({ order: ORDER.id, token: ORDER.token, ...body }) });
const chunkReq = (upload: string, index: number, body: Uint8Array, headers: Record<string, string> = authHeaders) =>
  new Request(`${BASE}/api/reviews/video?upload=${upload}&index=${index}`, { method: "PUT", headers: { ...headers, "content-type": "application/octet-stream", "x-forwarded-for": nextIp() }, body: new Blob([body as Uint8Array<ArrayBuffer>]) });
async function finishReq(upload: string) {
  const form = new FormData();
  form.set("order", ORDER.id);
  form.set("token", ORDER.token);
  form.set("upload", upload);
  const poster = await sharp({ create: { width: 720, height: 1280, channels: 3, background: "#335544" } }).jpeg().toBuffer();
  form.set("poster", new Blob([new Uint8Array(poster)], { type: "image/jpeg" }), "poster.jpg");
  return new Request(`${BASE}/api/reviews/video`, { method: "POST", headers: { "x-forwarded-for": nextIp() }, body: form });
}
const media = (url: string, range?: string) => {
  const key = url.replace(/^\/media\//, "");
  return getMedia(new Request(`${BASE}${url}`, { headers: { "x-forwarded-for": nextIp(), ...(range ? { range } : {}) } }), { params: Promise.resolve({ key: key.split("/") }) });
};

async function uploadAll(file: Uint8Array) {
  const res = await postVideo(startReq({ size: file.byteLength, type: "video/mp4", duration: 9.87 }));
  expect(res.status).toBe(201);
  const { upload, chunkSize, chunks } = (await res.json()) as { upload: string; chunkSize: number; chunks: number };
  expect(chunkSize).toBe(REVIEW_VIDEO_CHUNK_BYTES);
  for (let i = 0; i < chunks; i++) {
    const put = await putChunk(chunkReq(upload, i, file.subarray(i * chunkSize, Math.min(file.byteLength, (i + 1) * chunkSize))));
    expect(put.status, `chunk ${i}`).toBe(200);
  }
  return { upload, chunks };
}

const DRIVERS = {
  local: { UPLOADS_DRIVER: "local" },
  netlify: { UPLOADS_DRIVER: "netlify" },
  s3: { S3_BUCKET: "bucket", S3_REGION: "eu-central-1", S3_ACCESS_KEY_ID: "test", S3_SECRET_ACCESS_KEY: "test", S3_PUBLIC_URL: "https://cdn.example.test" },
} as const;
const ENV_KEYS = ["UPLOADS_DRIVER", "S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_URL"];

afterAll(() => {
  fs.rmSync(tmp.dir, { recursive: true, force: true });
});

describe.each(Object.keys(DRIVERS) as (keyof typeof DRIVERS)[])("review video upload (%s driver)", (driver) => {
  beforeAll(() => {
    for (const k of ENV_KEYS) delete process.env[k];
    Object.assign(process.env, DRIVERS[driver]);
  });
  afterAll(() => {
    for (const k of ENV_KEYS) delete process.env[k];
  });
  beforeEach(() => {
    docs.clear();
    rateLimitInternals.clear();
    admin.loggedIn = false;
  });

  it("uploads in chunks, attaches the video to the review and serves it with Range after approval", { timeout: 20_000 }, async () => {
    const file = fakeMp4();
    const { upload, chunks } = await uploadAll(file);
    expect(chunks).toBe(3);

    // The review cannot use an unfinished upload.
    const early = new FormData();
    for (const [k, v] of Object.entries({ order: ORDER.id, token: ORDER.token, name: "Anna M.", rating: "5", text: "Wunderschöne Rosen, pünktlich da.", consent: "true", website: "", video: upload })) early.set(k, v);
    expect((await postReview(new Request(`${BASE}/api/reviews`, { method: "POST", headers: { "x-forwarded-for": nextIp() }, body: early }))).status).toBe(422);

    const fin = await postVideo(await finishReq(upload));
    expect(fin.status).toBe(200);
    const manifest = await readReviewVideoManifest(upload);
    expect(manifest).toMatchObject({ status: "complete", size: file.byteLength, duration: 9.87, type: "video/mp4", orderId: ORDER.id });
    expect(manifest?.poster?.key).toMatch(/^reviews\/\d{4}\/\d{2}\/red-passion-video-[a-f0-9]{8}\.jpg$/);

    const res = await postReview(new Request(`${BASE}/api/reviews`, { method: "POST", headers: { "x-forwarded-for": nextIp() }, body: early }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, photos: 0, video: true });
    const [submission] = docs.get("review-submissions") as ReviewSubmission[];
    expect(submission.video).toMatchObject({ id: upload, url: `/media/review-videos/${upload}/video.mp4`, bytes: file.byteLength, duration: 9.87, contentType: "video/mp4", width: 720, height: 1280 });
    expect((await readReviewVideoManifest(upload))?.status).toBe("submitted");

    // Pending: invisible for the public, playable for an admin.
    const url = submission.video!.url;
    expect((await media(url, "bytes=0-1")).status).toBe(404);
    admin.loggedIn = true;
    const probe = await media(url, "bytes=0-1");
    expect(probe.status).toBe(206);
    expect(probe.headers.get("content-range")).toBe(`bytes 0-1/${file.byteLength}`);
    expect(probe.headers.get("cache-control")).toContain("no-store");
    expect(new Uint8Array(await probe.arrayBuffer())).toEqual(file.subarray(0, 2));

    // Approved: public. A range across the first chunk boundary is stitched together.
    admin.loggedIn = false;
    await writeReviewVideoManifest({ ...(await readReviewVideoManifest(upload))!, status: "approved" });
    const start = REVIEW_VIDEO_CHUNK_BYTES - 10;
    const across = await media(url, `bytes=${start}-${start + 19}`);
    expect(across.status).toBe(206);
    expect(across.headers.get("accept-ranges")).toBe("bytes");
    expect(across.headers.get("content-type")).toBe("video/mp4");
    expect(across.headers.get("content-length")).toBe("20");
    expect(new Uint8Array(await across.arrayBuffer())).toEqual(file.subarray(start, start + 20));

    // Open-ended ranges are answered with at most one chunk; the player asks for the rest.
    const open = await media(url, "bytes=5-");
    expect(open.headers.get("content-range")).toBe(`bytes 5-${5 + REVIEW_VIDEO_CHUNK_BYTES - 1}/${file.byteLength}`);
    expect((await open.arrayBuffer()).byteLength).toBe(REVIEW_VIDEO_CHUNK_BYTES);
    const tail = await media(url, "bytes=-100");
    expect(new Uint8Array(await tail.arrayBuffer())).toEqual(file.subarray(file.byteLength - 100));
    expect((await media(url, `bytes=${file.byteLength}-`)).status).toBe(416);

    // Without Range: the whole file, streamed chunk by chunk.
    const full = await media(url);
    expect(full.status).toBe(200);
    expect(full.headers.get("content-length")).toBe(String(file.byteLength));
    // Buffer.equals – a deep toEqual over 8 MB takes ages.
    expect(Buffer.from(await full.arrayBuffer()).equals(Buffer.from(file))).toBe(true);

    // Wrong extension or unknown id → 404.
    expect((await media(url.replace(".mp4", ".webm"), "bytes=0-1")).status).toBe(404);
    expect((await media("/media/review-videos/ffffffffffffffffffffffff/video.mp4", "bytes=0-1")).status).toBe(404);

    // Deleting removes chunks, manifest and poster.
    await deleteReviewVideo(upload);
    expect(await readReviewVideoManifest(upload)).toBeNull();
    expect((await media(url, "bytes=0-1")).status).toBe(404);
    if (driver === "local") expect(fs.existsSync(path.join(tmp.dir, "public", "uploads", "review-videos", upload))).toBe(false);
    if (driver === "netlify") expect([...blobs.data.keys()].filter((k) => k.includes(upload) || k === manifest!.poster!.key)).toEqual([]);
    if (driver === "s3") expect([...s3.objects.keys()].filter((k) => k.includes(upload) || k.endsWith(manifest!.poster!.key))).toEqual([]);
  });

  it("validates the start request: type, size, duration and the order token", async () => {
    expect((await postVideo(startReq({ size: 1000, type: "video/x-msvideo", duration: 5 }))).status).toBe(422);
    expect((await postVideo(startReq({ size: 61 * 1024 * 1024, type: "video/mp4", duration: 5 }))).status).toBe(422);
    const long = await postVideo(startReq({ size: 1000, type: "video/mp4", duration: 15.6 }));
    expect(long.status).toBe(422);
    expect((await long.json()).errors.video).toMatch(/15 Sekunden/);
    expect((await postVideo(startReq({ size: 1000, type: "video/mp4", duration: 5, token: "wrong" }))).status).toBe(404);
  });

  it("checks chunk sizes, magic bytes and the binding to the order", async () => {
    const file = fakeMp4(5000);
    const res = await postVideo(startReq({ size: file.byteLength, type: "video/webm", duration: 3 }));
    const { upload } = (await res.json()) as { upload: string };
    // Declared WebM, but the bytes are MP4.
    expect((await putChunk(chunkReq(upload, 0, file))).status).toBe(415);
    // Wrong length, unknown index, wrong token.
    expect((await putChunk(chunkReq(upload, 0, file.subarray(0, 4000)))).status).toBe(400);
    expect((await putChunk(chunkReq(upload, 1, file))).status).toBe(400);
    expect((await putChunk(chunkReq(upload, 0, file, { ...authHeaders, "x-review-token": "nope" }))).status).toBe(404);
    // Not every chunk there → finish refuses.
    const fin = await postVideo(await finishReq(upload));
    expect(fin.status).toBe(409);
    expect((await fin.json()).missing).toBe(0);
    // The customer drops it again.
    expect((await deleteUpload(new Request(`${BASE}/api/reviews/video?upload=${upload}`, { method: "DELETE", headers: { ...authHeaders, "x-forwarded-for": nextIp() } }))).status).toBe(200);
    expect(await readReviewVideoManifest(upload)).toBeNull();
  });

  it("rate-limits chunk uploads before reading the body", async () => {
    const from = "203.0.113.77";
    let last = 0;
    for (let i = 0; i < 121; i++) {
      const res = await putChunk(new Request(`${BASE}/api/reviews/video?upload=x&index=0`, { method: "PUT", headers: { "x-forwarded-for": from }, body: "x" }));
      last = res.status;
    }
    expect(last).toBe(429);
  });
});


describe("admin decision on a review video (local driver)", () => {
  beforeAll(() => {
    for (const k of ENV_KEYS) delete process.env[k];
    process.env.UPLOADS_DRIVER = "local";
  });
  afterAll(() => {
    delete process.env.UPLOADS_DRIVER;
  });
  beforeEach(() => {
    docs.clear();
    rateLimitInternals.clear();
    admin.loggedIn = false;
  });

  async function submitWithVideo() {
    const file = fakeMp4(REVIEW_VIDEO_CHUNK_BYTES + 99);
    const { upload } = await uploadAll(file);
    expect((await postVideo(await finishReq(upload))).status).toBe(200);
    const form = new FormData();
    for (const [k, v] of Object.entries({ order: ORDER.id, token: ORDER.token, name: "Anna M.", rating: "5", text: "Wunderschöne Rosen, pünktlich da.", consent: "true", website: "", video: upload })) form.set(k, v);
    expect((await postReview(new Request(`${BASE}/api/reviews`, { method: "POST", headers: { "x-forwarded-for": nextIp() }, body: form }))).status).toBe(201);
    const [submission] = docs.get("review-submissions") as ReviewSubmission[];
    return { upload, submission, file };
  }
  const decision = (id: string, video?: string) => {
    const fd = new FormData();
    fd.set("id", id);
    if (video) fd.set("video", video);
    return fd;
  };

  it("„Übernehmen“ with „Video zeigen“ publishes it and makes it public", async () => {
    const { upload, submission, file } = await submitWithVideo();
    await acceptSubmission(decision(submission.id, upload));
    const [review] = docs.get("content:reviews") as Review[];
    expect(review.video).toMatchObject({ src: submission.video!.url, poster: submission.video!.posterUrl, alt: "Kundenvideo zu Red Passion", width: 720, height: 1280 });
    expect((await readReviewVideoManifest(upload))?.status).toBe("approved");
    const res = await media(submission.video!.url, "bytes=0-3");
    expect(res.status).toBe(206);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(file.subarray(0, 4));
  });

  it("„Übernehmen“ without the checkbox and „Verwerfen“ delete the video", async () => {
    const first = await submitWithVideo();
    await acceptSubmission(decision(first.submission.id));
    expect((docs.get("content:reviews") as Review[])[0].video).toBeUndefined();
    expect(await readReviewVideoManifest(first.upload)).toBeNull();
    expect(fs.existsSync(path.join(tmp.dir, "public", "uploads", first.submission.video!.posterKey))).toBe(false);

    docs.clear();
    const second = await submitWithVideo();
    await rejectSubmission(decision(second.submission.id));
    expect(await readReviewVideoManifest(second.upload)).toBeNull();
    expect(fs.existsSync(path.join(tmp.dir, "public", "uploads", "review-videos", second.upload))).toBe(false);
  });
});

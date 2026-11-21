import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

/**
 * Admin upload of a review video (/api/admin/reviews/video): every step needs an admin
 * session, the same checks as the customer route apply, and „finish“ publishes the
 * video at once (manifest `approved`, playable without login). Local driver in a temp dir.
 */

vi.mock("server-only", () => ({}));

const tmp = vi.hoisted(() => {
  /* eslint-disable @typescript-eslint/no-require-imports -- vi.hoisted runs before the imports */
  const nodeFs = require("node:fs") as typeof import("node:fs");
  const nodeOs = require("node:os") as typeof import("node:os");
  const nodePath = require("node:path") as typeof import("node:path");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "admin-review-video-"));
  process.cwd = () => dir;
  return { dir };
});

vi.mock("@/lib/cms", () => ({
  getAllProducts: vi.fn(async () => [{ id: "p-red", slug: "red-passion", name: "Red Passion" }]),
}));

const admin = vi.hoisted(() => ({ loggedIn: false }));
vi.mock("@/lib/admin-session", () => ({
  isAdminAuthenticated: vi.fn(async () => admin.loggedIn),
  requireAdmin: vi.fn(async () => {
    if (!admin.loggedIn) throw new Error("Nicht angemeldet.");
  }),
}));

import { DELETE as del, POST as post, PUT as put } from "@/app/api/admin/reviews/video/route";
import { GET as getMedia } from "@/app/media/[...key]/route";
import { rateLimitInternals } from "@/lib/rate-limit";
import { REVIEW_VIDEO_CHUNK_BYTES } from "@/lib/review-video";
import { createReviewVideoUpload, readReviewVideoManifest } from "@/lib/uploads";

const BASE = "http://localhost:3000";
const ENDPOINT = `${BASE}/api/admin/reviews/video`;
let ip = 0;
const nextIp = () => `192.0.2.${++ip % 250}`;

function fakeMp4(size: number) {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) bytes[i] = (i * 17 + (i >> 9)) & 0xff;
  bytes.set([0, 0, 0, 0x20, ...Buffer.from("ftypmp42")], 0);
  return bytes;
}

const startReq = (body: Record<string, unknown>) =>
  new Request(ENDPOINT, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": nextIp() }, body: JSON.stringify(body) });
const chunkReq = (upload: string, index: number, body: Uint8Array) =>
  new Request(`${ENDPOINT}?upload=${upload}&index=${index}`, { method: "PUT", headers: { "content-type": "application/octet-stream", "x-forwarded-for": nextIp() }, body: new Blob([body as Uint8Array<ArrayBuffer>]) });
async function finishReq(upload: string, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set("upload", upload);
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  const poster = await sharp({ create: { width: 360, height: 640, channels: 3, background: "#884455" } }).jpeg().toBuffer();
  form.set("poster", new Blob([new Uint8Array(poster)], { type: "image/jpeg" }), "poster.jpg");
  return new Request(ENDPOINT, { method: "POST", headers: { "x-forwarded-for": nextIp() }, body: form });
}
const deleteReq = (upload: string) => new Request(`${ENDPOINT}?upload=${upload}`, { method: "DELETE", headers: { "x-forwarded-for": nextIp() } });
const media = (url: string, range?: string) =>
  getMedia(new Request(`${BASE}${url}`, { headers: { "x-forwarded-for": nextIp(), ...(range ? { range } : {}) } }), { params: Promise.resolve({ key: url.replace(/^\/media\//, "").split("/") }) });

async function startAndSend(file: Uint8Array, duration = 7.5) {
  const res = await post(startReq({ size: file.byteLength, type: "video/mp4", duration }));
  expect(res.status).toBe(201);
  const { upload, chunkSize, chunks } = (await res.json()) as { upload: string; chunkSize: number; chunks: number };
  for (let i = 0; i < chunks; i++) {
    expect((await put(chunkReq(upload, i, file.subarray(i * chunkSize, Math.min(file.byteLength, (i + 1) * chunkSize))))).status, `chunk ${i}`).toBe(200);
  }
  return { upload, chunks };
}

beforeAll(() => {
  process.env.UPLOADS_DRIVER = "local";
});
afterAll(() => {
  delete process.env.UPLOADS_DRIVER;
  fs.rmSync(tmp.dir, { recursive: true, force: true });
});
beforeEach(() => {
  rateLimitInternals.clear();
  admin.loggedIn = false;
});

describe("admin review video upload", () => {
  it("refuses every step without an admin session", async () => {
    const start = await post(startReq({ size: 5000, type: "video/mp4", duration: 3 }));
    expect(start.status).toBe(401);
    expect(fs.existsSync(path.join(tmp.dir, "public", "uploads", "review-videos"))).toBe(false);

    // An upload that exists (started by a logged-in admin) cannot be continued without one.
    admin.loggedIn = true;
    const file = fakeMp4(5000);
    const { upload } = (await (await post(startReq({ size: file.byteLength, type: "video/mp4", duration: 3 }))).json()) as { upload: string };
    admin.loggedIn = false;
    expect((await put(chunkReq(upload, 0, file))).status).toBe(401);
    expect((await post(await finishReq(upload))).status).toBe(401);
    expect((await del(deleteReq(upload))).status).toBe(401);
    expect((await readReviewVideoManifest(upload))?.status).toBe("uploading");
  });

  it("uploads in chunks, publishes the video at once and returns the review fields", { timeout: 20_000 }, async () => {
    admin.loggedIn = true;
    const file = fakeMp4(REVIEW_VIDEO_CHUNK_BYTES + 777);
    const { upload, chunks } = await startAndSend(file, 12.345);
    expect(chunks).toBe(2);

    const res = await post(await finishReq(upload, { product: "red-passion", width: "1080", height: "1920" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; video: { src: string; poster: string; duration: number; width: number; height: number } };
    expect(body.video).toMatchObject({ src: `/media/review-videos/${upload}/video.mp4`, duration: 12.35, width: 1080, height: 1920 });
    expect(body.video.poster).toMatch(/^\/(?:media|uploads)\/reviews\/\d{4}\/\d{2}\/red-passion-video-[a-f0-9]{8}\.jpg$/);

    const manifest = await readReviewVideoManifest(upload);
    expect(manifest).toMatchObject({ status: "approved", orderId: "admin", size: file.byteLength, type: "video/mp4" });
    expect(manifest?.poster).toMatchObject({ width: 360, height: 640 });

    // Finishing again is idempotent.
    const again = await post(await finishReq(upload));
    expect(again.status).toBe(200);
    expect(((await again.json()) as typeof body).video.src).toBe(body.video.src);

    // Public without an admin cookie, with HTTP Range.
    admin.loggedIn = false;
    const range = await media(body.video.src, "bytes=0-7");
    expect(range.status).toBe(206);
    expect(new Uint8Array(await range.arrayBuffer())).toEqual(file.subarray(0, 8));

    // A published video is not deleted by the cleanup endpoint.
    admin.loggedIn = true;
    expect((await del(deleteReq(upload))).status).toBe(409);
    expect(await readReviewVideoManifest(upload)).not.toBeNull();
  });

  it("falls back to the poster size and a neutral file name", async () => {
    admin.loggedIn = true;
    const { upload } = await startAndSend(fakeMp4(3000), 2);
    const res = await post(await finishReq(upload, { width: "abc" }));
    const { video } = (await res.json()) as { video: { poster: string; width: number; height: number } };
    expect(video).toMatchObject({ width: 360, height: 640 });
    expect(video.poster).toMatch(/\/kundenvideo-video-[a-f0-9]{8}\.jpg$/);
  });

  it("applies the same validation as the customer upload", async () => {
    admin.loggedIn = true;
    const long = await post(startReq({ size: 1000, type: "video/mp4", duration: 15.6 }));
    expect(long.status).toBe(422);
    expect(((await long.json()) as { message: string }).message).toMatch(/15 Sekunden/);
    expect((await post(startReq({ size: 1000, type: "video/x-msvideo", duration: 5 }))).status).toBe(422);
    expect((await post(startReq({ size: 61 * 1024 * 1024, type: "video/mp4", duration: 5 }))).status).toBe(422);
    expect((await post(startReq({ size: 1000, type: "video/mp4", duration: 15.5 }))).status).toBe(201);

    // Declared WebM, MP4 bytes → 415; wrong length / index → 400.
    const file = fakeMp4(5000);
    const { upload } = (await (await post(startReq({ size: file.byteLength, type: "video/webm", duration: 3 }))).json()) as { upload: string };
    expect((await put(chunkReq(upload, 0, file))).status).toBe(415);
    expect((await put(chunkReq(upload, 0, file.subarray(0, 4000)))).status).toBe(400);
    expect((await put(chunkReq(upload, 1, file))).status).toBe(400);
    // Not complete → finish refuses.
    const fin = await post(await finishReq(upload));
    expect(fin.status).toBe(409);
    expect(((await fin.json()) as { missing: number }).missing).toBe(0);
    // A failed attempt can be dropped.
    expect((await del(deleteReq(upload))).status).toBe(200);
    expect(await readReviewVideoManifest(upload)).toBeNull();
  });

  it("cannot touch customer uploads (bound to an order)", async () => {
    admin.loggedIn = true;
    const customer = await createReviewVideoUpload({ orderId: "BQ-CUST01", type: "video/mp4", size: 3000, duration: 2 });
    expect((await put(chunkReq(customer.id, 0, fakeMp4(3000)))).status).toBe(404);
    expect((await post(await finishReq(customer.id))).status).toBe(404);
    await del(deleteReq(customer.id));
    expect(await readReviewVideoManifest(customer.id)).not.toBeNull();
  });

  it("rate-limits before checking the session", async () => {
    const from = "203.0.113.91";
    let last = 0;
    for (let i = 0; i < 301; i++) {
      last = (await put(new Request(`${ENDPOINT}?upload=x&index=0`, { method: "PUT", headers: { "x-forwarded-for": from }, body: "x" }))).status;
    }
    expect(last).toBe(429);
  });
});

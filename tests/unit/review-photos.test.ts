import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));

/** Fake Netlify Blobs store – the real one only works on Netlify. */
const blobs = vi.hoisted(() => {
  const data = new Map<string, { bytes: Uint8Array; metadata: Record<string, unknown> }>();
  const store = {
    set: vi.fn(async (key: string, value: Blob, opts?: { metadata?: Record<string, unknown> }) => {
      data.set(key, { bytes: new Uint8Array(await value.arrayBuffer()), metadata: opts?.metadata ?? {} });
      return { modified: true };
    }),
    getWithMetadata: vi.fn(async (key: string) => {
      const e = data.get(key);
      return e ? { data: e.bytes.buffer.slice(e.bytes.byteOffset, e.bytes.byteOffset + e.bytes.byteLength), metadata: e.metadata, etag: "x" } : null;
    }),
    getMetadata: vi.fn(async (key: string) => (data.has(key) ? { metadata: data.get(key)!.metadata, etag: "x" } : null)),
    delete: vi.fn(async (key: string) => void data.delete(key)),
    list: vi.fn(async () => ({ blobs: [...data.keys()].map((key) => ({ key, etag: "x" })), directories: [] })),
  };
  return { data, store, getStore: vi.fn(() => store) };
});
vi.mock("@netlify/blobs", () => ({ getStore: blobs.getStore }));

import {
  BLOB_STORE_NAME,
  deleteReviewPhoto,
  getUploadDriver,
  HEIC_MESSAGE,
  isNetlifyRuntime,
  isServableMediaKey,
  listUploads,
  processReviewPhoto,
  readStoredMedia,
  reviewPhotoSizeError,
  saveUpload,
  storeReviewPhoto,
  UploadError,
} from "@/lib/uploads";
import { collectReviewPhotos, MAX_REVIEW_PHOTO_BYTES, photoListError, publicReviewPhotos, readReviewFields, validateReviewFields } from "@/lib/review-submission";
import type { Review } from "@/types";

const S3_VARS = { S3_BUCKET: "b", S3_REGION: "eu-central-1", S3_ACCESS_KEY_ID: "id", S3_SECRET_ACCESS_KEY: "secret" };

function clearDriverEnv() {
  for (const k of ["NETLIFY", "NETLIFY_BLOBS_CONTEXT", "BUILD_ON_NETLIFY", "UPLOADS_DRIVER", ...Object.keys(S3_VARS)]) vi.stubEnv(k, "");
  delete (globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext;
}

beforeEach(() => {
  clearDriverEnv();
  blobs.data.clear();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllEnvs();
  delete (globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext;
});

/* ---------------- driver selection ---------------- */

describe("upload driver selection", () => {
  it("uses the local filesystem off Netlify", () => {
    expect(isNetlifyRuntime()).toBe(false);
    expect(getUploadDriver()).toBe("local");
  });

  it("uses Netlify Blobs when the Blobs context is present", () => {
    vi.stubEnv("NETLIFY_BLOBS_CONTEXT", "eyJzaXRlSUQiOiJ4In0=");
    expect(getUploadDriver()).toBe("netlify");
  });

  it("uses Netlify Blobs when the context is set on globalThis", () => {
    (globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext = "eyJ9";
    expect(getUploadDriver()).toBe("netlify");
  });

  it("uses Netlify Blobs when the build ran on Netlify (baked BUILD_ON_NETLIFY) or NETLIFY=true", () => {
    vi.stubEnv("BUILD_ON_NETLIFY", "1");
    expect(getUploadDriver()).toBe("netlify");
    vi.stubEnv("BUILD_ON_NETLIFY", "");
    vi.stubEnv("NETLIFY", "true");
    expect(getUploadDriver()).toBe("netlify");
  });

  it("keeps S3 whenever it is configured, also on Netlify", () => {
    for (const [k, v] of Object.entries(S3_VARS)) vi.stubEnv(k, v);
    expect(getUploadDriver()).toBe("s3");
    vi.stubEnv("NETLIFY_BLOBS_CONTEXT", "eyJ9");
    expect(getUploadDriver()).toBe("s3");
  });

  it("needs all four S3 variables", () => {
    vi.stubEnv("S3_BUCKET", "b");
    vi.stubEnv("NETLIFY", "true");
    expect(getUploadDriver()).toBe("netlify");
  });

  it("can be forced with UPLOADS_DRIVER", () => {
    vi.stubEnv("NETLIFY", "true");
    vi.stubEnv("UPLOADS_DRIVER", "local");
    expect(getUploadDriver()).toBe("local");
    vi.stubEnv("NETLIFY", "");
    vi.stubEnv("UPLOADS_DRIVER", "netlify");
    expect(getUploadDriver()).toBe("netlify");
    vi.stubEnv("UPLOADS_DRIVER", "s3"); // only via S3_* – ignored
    expect(getUploadDriver()).toBe("local");
  });
});

/* ---------------- photo processing ---------------- */

async function jpegWithExif(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 180, g: 40, b: 60 } } })
    .jpeg({ quality: 90 })
    .withMetadata({
      orientation: 6, // "rotate 90° clockwise to display"
      exif: { IFD0: { Make: "TestPhone", Model: "Cam 1" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "48/1 12/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "16/1 22/1 0/1" } },
    })
    .toBuffer();
}

describe("processReviewPhoto", () => {
  it("auto-rotates, strips EXIF/GPS, scales to 1600 px and writes JPEG", async () => {
    const input = await jpegWithExif(3000, 2000);
    const inMeta = await sharp(input).metadata();
    expect(inMeta.orientation).toBe(6);
    expect(inMeta.exif).toBeDefined();

    const out = await processReviewPhoto(input);
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("jpeg");
    // Orientation 6 means the stored 3000×2000 is shown as 2000×3000 → portrait after rotation.
    expect([out.width, out.height]).toEqual([1067, 1600]);
    expect([meta.width, meta.height]).toEqual([1067, 1600]);
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect(out.data.includes(Buffer.from("TestPhone"))).toBe(false);
  });

  it("keeps small photos at their size", async () => {
    const out = await processReviewPhoto(await sharp({ create: { width: 800, height: 600, channels: 3, background: "#ffffff" } }).png().toBuffer());
    expect([out.width, out.height]).toEqual([800, 600]);
    expect((await sharp(out.data).metadata()).format).toBe("jpeg");
  });

  it("accepts WebP and flattens transparent PNG onto white", async () => {
    const webp = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#336633" } }).webp().toBuffer();
    expect((await processReviewPhoto(webp)).width).toBe(40);
    const png = await sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const out = await processReviewPhoto(png);
    const { data } = await sharp(out.data).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(240); // white, not black
  });

  it("decides by the bytes: GIF, AVIF, text and broken files are refused", async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).gif().toBuffer();
    await expect(processReviewPhoto(gif)).rejects.toMatchObject({ status: 415 });
    const avif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).avif().toBuffer();
    await expect(processReviewPhoto(avif)).rejects.toMatchObject({ status: 415 });
    await expect(processReviewPhoto(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).rejects.toMatchObject({ status: 415 });
    const jpeg = await jpegWithExif(200, 200);
    await expect(processReviewPhoto(jpeg.subarray(0, 400))).rejects.toBeInstanceOf(UploadError);
  });

  it("explains HEIC instead of a generic error", async () => {
    // ISO-BMFF header with the "heic" brand (what an iPhone writes) – the bundled libvips cannot decode HEVC.
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.from([0, 0, 0, 0]), Buffer.from("mif1heic"), Buffer.alloc(64)]);
    await expect(processReviewPhoto(heic)).rejects.toMatchObject({ status: 415, message: HEIC_MESSAGE });
  });

  it("refuses empty files and files over 10 MB before decoding", async () => {
    expect(reviewPhotoSizeError(0)).toMatch(/leer/);
    expect(reviewPhotoSizeError(MAX_REVIEW_PHOTO_BYTES)).toBeNull();
    expect(reviewPhotoSizeError(MAX_REVIEW_PHOTO_BYTES + 1)).toMatch(/10 MB/);
    await expect(processReviewPhoto(Buffer.alloc(MAX_REVIEW_PHOTO_BYTES + 1))).rejects.toMatchObject({ status: 413 });
    await expect(processReviewPhoto(Buffer.alloc(0))).rejects.toMatchObject({ status: 400 });
  });
});

/* ---------------- Netlify Blobs driver ---------------- */

describe("Netlify Blobs driver", () => {
  beforeEach(() => vi.stubEnv("NETLIFY_BLOBS_CONTEXT", "eyJ9"));

  it("stores review photos in the media store and serves them via /media", async () => {
    const photo = await processReviewPhoto(await jpegWithExif(400, 300));
    const saved = await storeReviewPhoto(photo, "red-passion");
    expect(blobs.getStore).toHaveBeenCalledWith({ name: BLOB_STORE_NAME });
    expect(saved.key).toMatch(/^reviews\/\d{4}\/\d{2}\/red-passion-[a-f0-9]{8}\.jpg$/);
    expect(saved.url).toBe(`/media/${saved.key}`);
    expect(isServableMediaKey(saved.key)).toBe(true);

    const read = await readStoredMedia(saved.key);
    expect(read?.contentType).toBe("image/jpeg");
    expect(Buffer.from(read!.data).equals(photo.data)).toBe(true);

    await deleteReviewPhoto(saved.key);
    expect(await readStoredMedia(saved.key)).toBeNull();
    await expect(deleteReviewPhoto(saved.key)).resolves.toBeUndefined(); // already gone → fine
  });

  it("stores admin uploads there too and lists only those in the media library", async () => {
    const png = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#123456" } }).png().toBuffer();
    const admin = await saveUpload({ buffer: png, filename: "Rosen Strauß.png" });
    expect(admin.url).toBe(`/media/${admin.key}`);
    expect(admin.key).toMatch(/^\d{4}\/\d{2}\/rosen-strauss-[a-f0-9]{8}\.jpg$/);
    await storeReviewPhoto(await processReviewPhoto(png), "kundenfoto");
    const items = await listUploads();
    expect(items.map((i) => i.key)).toEqual([admin.key]);
    expect(items[0].bytes).toBeGreaterThan(0);
  });

  it("only serves well-formed keys", async () => {
    expect(isServableMediaKey("../../etc/passwd")).toBe(false);
    expect(isServableMediaKey("reviews/2026/11/x-12345678.png")).toBe(false);
    expect(await readStoredMedia("reviews/../2026/11/a-12345678.jpg")).toBeNull();
    expect(blobs.store.getWithMetadata).not.toHaveBeenCalled();
  });
});

/* ---------------- form parsing ---------------- */

describe("review form parsing", () => {
  const jpeg = (size = 10) => new File([new Uint8Array(size)], "a.jpg", { type: "image/jpeg" });

  it("reads multipart fields and requires consent", () => {
    const form = new FormData();
    form.set("order", " bq-abc123 ");
    form.set("token", "t");
    form.set("name", "Anna M.");
    form.set("rating", "5");
    form.set("text", "Wunderschöne Blumen!\r\nDanke.");
    const fields = readReviewFields(form);
    expect(fields).toMatchObject({ order: "BQ-ABC123", rating: 5, text: "Wunderschöne Blumen!\nDanke.", consent: false });
    expect(validateReviewFields(fields)).toEqual({ consent: expect.stringMatching(/bestätige/) });
    form.set("consent", "true");
    expect(validateReviewFields(readReviewFields(form))).toEqual({});
  });

  it("reads JSON bodies the same way", () => {
    expect(readReviewFields({ order: "bq-1", rating: 4, consent: true, name: "Al", text: "1234567890" })).toMatchObject({ order: "BQ-1", rating: 4, consent: true });
    expect(validateReviewFields(readReviewFields({ rating: 7, consent: "no" }))).toMatchObject({ name: expect.any(String), rating: expect.any(String), text: expect.any(String), consent: expect.any(String) });
  });

  it("collects up to three photos and skips the empty file input entry", () => {
    const form = new FormData();
    form.append("photos", new File([], "", { type: "application/octet-stream" }));
    form.append("photos", jpeg());
    form.append("photos", "not a file");
    expect(collectReviewPhotos(form)).toMatchObject({ files: [expect.any(File)], error: null });
    form.append("photos", jpeg());
    form.append("photos", jpeg());
    expect(collectReviewPhotos(form).error).toBeNull();
    form.append("photos", jpeg());
    expect(collectReviewPhotos(form).error).toMatch(/höchstens 3/);
  });

  it("limits each photo to 10 MB", () => {
    expect(photoListError([MAX_REVIEW_PHOTO_BYTES])).toBeNull();
    expect(photoListError([1, MAX_REVIEW_PHOTO_BYTES + 1])).toMatch(/10 MB/);
    expect(photoListError([0])).toMatch(/leer/);
  });
});

describe("publicReviewPhotos", () => {
  const base: Review = { id: "r1", name: "Anna", rating: 5, text: "x", verified: true, date: "2026-11-16", demo: false, photos: [{ src: "/media/reviews/2026/11/a-12345678.jpg", alt: "Kundenfoto zu Red Passion" }] };
  it("shows photos only for real, verified reviews", () => {
    expect(publicReviewPhotos(base)).toHaveLength(1);
    expect(publicReviewPhotos({ ...base, demo: true })).toEqual([]);
    expect(publicReviewPhotos({ ...base, verified: false })).toEqual([]);
    expect(publicReviewPhotos({ ...base, photos: undefined })).toEqual([]);
  });
});

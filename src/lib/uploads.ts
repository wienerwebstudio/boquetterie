import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { slugify } from "@/lib/format";
import { MAX_REVIEW_PHOTO_BYTES } from "@/lib/review-submission";

/**
 * Upload storage for admin images (product photos, hero images, …) and customer
 * review photos.
 *
 * Three drivers, selected by environment (`getUploadDriver`):
 *  - `s3`: any S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, Hetzner, …) when
 *    S3_BUCKET + S3_REGION + S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY are set.
 *    Optional: S3_ENDPOINT (R2/MinIO), S3_PREFIX (default "uploads"),
 *    S3_PUBLIC_URL or UPLOADS_PUBLIC_HOST for the public base URL.
 *  - `netlify`: Netlify Blobs (site-wide store "media") when the app runs on Netlify
 *    and S3 is not configured. Served by the route `/media/<key>`.
 *  - `local` (default elsewhere): files land in `public/uploads/<yyyy>/<mm>/<slug>-<hash>.<ext>`
 *    and are served by Next as `/uploads/…`. Persist the folder via a Docker volume.
 *    Review photos are served through `/media/<key>` instead, because `next start`
 *    only serves files that were in `public/` when the server started.
 *
 * Every upload is sniffed and re-encoded with sharp – we never store the bytes a
 * browser sent us. EXIF (incl. GPS) is dropped in the process.
 * See docs/UPLOADS.md.
 */

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_SIDE_PX = 2000;
const JPEG_QUALITY = 82;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
/** Keys look like `2026/09/rosen-bouquet-1a2b3c4d.jpg` – nothing else is accepted. */
const KEY_RE = /^\d{4}\/\d{2}\/[a-z0-9-]{1,80}-[a-f0-9]{8}\.(jpg|png)$/;
/** Customer review photos: `reviews/2026/11/red-passion-1a2b3c4d.jpg` (kept out of the admin media library). */
const REVIEW_KEY_RE = /^reviews\/\d{4}\/\d{2}\/[a-z0-9-]{1,80}-[a-f0-9]{8}\.jpg$/;
/** Outreach files (admin → Outreach): images, PDFs and videos, e.g. `outreach/2026/11/preisliste-1a2b3c4d.pdf`. */
const OUTREACH_KEY_RE = /^outreach\/\d{4}\/\d{2}\/[a-z0-9-]{1,80}-[a-f0-9]{8}\.(jpg|png|pdf|mp4|webm|mov)$/;
const STATIC_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);

/* Review photos (customer uploads on /bewertung); count and byte limits live in review-submission.ts. */
export const REVIEW_PHOTO_MAX_SIDE_PX = 1600;
const REVIEW_PHOTO_QUALITY = 80;
const REVIEW_PHOTO_FORMATS = new Set(["jpeg", "png", "webp"]);

/** Name of the site-wide Netlify Blobs store. */
export const BLOB_STORE_NAME = "media";
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export interface SaveUploadInput { buffer: Buffer; filename: string; mime?: string }
export interface SaveUploadResult { url: string; key: string; width: number; height: number; bytes: number }
export interface UploadItem { key: string; url: string; bytes: number; modifiedAt: string }
export interface StaticImage { url: string; bytes: number; modifiedAt: string }

export class UploadError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

/* ---------------- driver selection ---------------- */

export type UploadDriver = "local" | "s3" | "netlify";

function s3Configured() {
  const { S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  return Boolean(S3_BUCKET && S3_REGION && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);
}

/**
 * True when the app runs on Netlify:
 *  - the Blobs context Netlify provides to functions (`NETLIFY_BLOBS_CONTEXT` / `globalThis.netlifyBlobsContext`), or
 *  - `BUILD_ON_NETLIFY`, baked in by next.config.ts because `NETLIFY=true` only exists during the build, or
 *  - `NETLIFY=true` itself (build time, `netlify dev`).
 */
export function isNetlifyRuntime(): boolean {
  const g = globalThis as { netlifyBlobsContext?: unknown };
  return Boolean(g.netlifyBlobsContext || process.env.NETLIFY_BLOBS_CONTEXT)
    || process.env.BUILD_ON_NETLIFY === "1"
    || process.env.NETLIFY === "true";
}

/**
 * S3 when configured (unchanged), else Netlify Blobs on Netlify (where the filesystem
 * is read-only), else the local filesystem. `UPLOADS_DRIVER=local|netlify` forces one
 * of the latter two (e.g. `netlify` for `netlify dev`, `local` to opt out).
 */
export function getUploadDriver(): UploadDriver {
  if (s3Configured()) return "s3";
  const forced = process.env.UPLOADS_DRIVER?.trim().toLowerCase();
  if (forced === "local" || forced === "netlify") return forced;
  return isNetlifyRuntime() ? "netlify" : "local";
}

const LOCAL_ROOT = path.join(process.cwd(), "public", "uploads");
const STATIC_ROOT = path.join(process.cwd(), "public", "images");

function s3Config() {
  const bucket = process.env.S3_BUCKET!;
  const region = process.env.S3_REGION!;
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const prefix = (process.env.S3_PREFIX ?? "uploads").replace(/^\/+|\/+$/g, "");
  const publicBase = (
    process.env.S3_PUBLIC_URL ||
    (process.env.UPLOADS_PUBLIC_HOST ? `https://${process.env.UPLOADS_PUBLIC_HOST}` : "") ||
    (endpoint ? `${endpoint.replace(/\/+$/, "")}/${bucket}` : `https://${bucket}.s3.${region}.amazonaws.com`)
  ).replace(/\/+$/, "");
  return { bucket, region, endpoint, prefix, publicBase };
}

async function s3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const { region, endpoint } = s3Config();
  return new S3Client({
    region,
    endpoint,
    // Path-style is required by MinIO and works with R2; AWS itself prefers virtual-hosted.
    forcePathStyle: Boolean(endpoint),
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
}

function objectKey(key: string) {
  const { prefix } = s3Config();
  return prefix ? `${prefix}/${key}` : key;
}

/**
 * Public URL of a stored key. Local admin uploads keep their `/uploads/…` URL;
 * Netlify Blobs and local review photos go through the `/media/…` route.
 */
export function publicUrl(key: string) {
  const driver = getUploadDriver();
  if (driver === "s3") return `${s3Config().publicBase}/${objectKey(key)}`;
  if (driver === "local" && !key.startsWith("reviews/") && !key.startsWith("outreach/")) return `/uploads/${key}`;
  return `/media/${key}`;
}

/* ---------------- Netlify Blobs ---------------- */

interface BlobMeta { contentType?: string; bytes?: number; uploadedAt?: string }

async function blobStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: BLOB_STORE_NAME });
}

/* ---------------- storage primitives (all drivers) ---------------- */

async function putObject(key: string, data: Buffer, contentType: string) {
  const driver = getUploadDriver();
  if (driver === "s3") {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    await client.send(new PutObjectCommand({ Bucket: s3Config().bucket, Key: objectKey(key), Body: data, ContentType: contentType, CacheControl: IMMUTABLE_CACHE }));
    return;
  }
  if (driver === "netlify") {
    const store = await blobStore();
    const metadata: BlobMeta = { contentType, bytes: data.length, uploadedAt: new Date().toISOString() };
    await store.set(key, new Blob([new Uint8Array(data)], { type: contentType }), { metadata: { ...metadata } });
    return;
  }
  const target = path.join(LOCAL_ROOT, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
}

async function deleteObject(key: string) {
  const driver = getUploadDriver();
  if (driver === "s3") {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    await client.send(new DeleteObjectCommand({ Bucket: s3Config().bucket, Key: objectKey(key) }));
    return;
  }
  if (driver === "netlify") {
    const store = await blobStore();
    if ((await store.getMetadata(key)) === null) throw new UploadError(404, "Datei nicht gefunden.");
    await store.delete(key);
    return;
  }
  const target = path.resolve(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT + path.sep)) throw new UploadError(400, "Ungültiger Dateischlüssel.");
  try {
    await fs.unlink(target);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new UploadError(404, "Datei nicht gefunden.");
    throw e;
  }
}

/** Keys the `/media/<key>` route may serve: admin uploads and review photos. */
export function isServableMediaKey(key: string) {
  return KEY_RE.test(key) || REVIEW_KEY_RE.test(key) || OUTREACH_KEY_RE.test(key);
}

export function isValidReviewPhotoKey(key: string) {
  return REVIEW_KEY_RE.test(key);
}

export interface StoredMedia { data: Uint8Array; contentType: string }

const OTHER_TYPES: Record<string, string> = { pdf: "application/pdf", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
const contentTypeOf = (key: string) => OTHER_TYPES[key.slice(key.lastIndexOf(".") + 1)] ?? (key.endsWith(".png") ? "image/png" : "image/jpeg");

/**
 * Reads one stored file for the `/media/<key>` route. On Netlify the Blobs store is
 * asked (whatever the driver is now, so `/media` URLs stay valid should S3 be added
 * later); elsewhere `public/uploads`. S3 objects are served by the bucket itself.
 */
export async function readStoredMedia(key: string): Promise<StoredMedia | null> {
  if (!isServableMediaKey(key)) return null;
  if (isNetlifyRuntime() || getUploadDriver() === "netlify") {
    const store = await blobStore();
    const entry = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (entry === null) return null;
    const meta = entry.metadata as BlobMeta;
    return { data: new Uint8Array(entry.data), contentType: meta.contentType || contentTypeOf(key) };
  }
  const target = path.resolve(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT + path.sep)) return null;
  try {
    return { data: new Uint8Array(await fs.readFile(target)), contentType: contentTypeOf(key) };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/* ---------------- image processing ---------------- */

interface Processed { data: Buffer; ext: "jpg" | "png"; mime: string; width: number; height: number }

interface ProcessOptions {
  maxSide: number;
  quality: number;
  formats: ReadonlySet<string>;
  /** Transparent PNGs stay PNG (admin uploads); otherwise everything becomes JPEG. */
  keepTransparentPng: boolean;
  unsupportedMessage: string;
}

const ADMIN_PROCESS: ProcessOptions = {
  maxSide: MAX_SIDE_PX,
  quality: JPEG_QUALITY,
  formats: ALLOWED_FORMATS,
  keepTransparentPng: true,
  unsupportedMessage: "Die Datei ist kein unterstütztes Bild (JPEG, PNG, WebP oder AVIF).",
};

const REVIEW_PROCESS: ProcessOptions = {
  maxSide: REVIEW_PHOTO_MAX_SIDE_PX,
  quality: REVIEW_PHOTO_QUALITY,
  formats: REVIEW_PHOTO_FORMATS,
  keepTransparentPng: false,
  unsupportedMessage: "Bitte nur Fotos als JPEG, PNG oder WebP hochladen.",
};

export const HEIC_MESSAGE = "HEIC-Fotos können wir leider nicht lesen. Bitte das Foto als JPEG auswählen – am iPhone passiert das beim Hochladen aus der Fotomediathek meist automatisch.";

/** HEIC/HEIF from iPhones (HEVC-compressed) – the prebuilt sharp/libvips we ship cannot decode it. */
function looksLikeHeic(buffer: Buffer) {
  if (buffer.length < 12 || buffer.toString("latin1", 4, 8) !== "ftyp") return false;
  return ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(buffer.toString("latin1", 8, 12));
}

/**
 * Sniff, auto-rotate, downscale and re-encode. Admin uploads: transparent PNGs stay
 * PNG, everything else becomes a progressive JPEG. Review photos: always JPEG.
 * next/image creates the responsive variants at request time, so nothing else is
 * generated here. sharp writes no metadata (EXIF, GPS) unless asked to.
 */
async function processImage(buffer: Buffer, opts: ProcessOptions = ADMIN_PROCESS): Promise<Processed> {
  let meta: Metadata;
  try {
    meta = await sharp(buffer, { limitInputPixels: 80_000_000 }).metadata();
  } catch {
    throw new UploadError(415, looksLikeHeic(buffer) ? HEIC_MESSAGE : opts.unsupportedMessage);
  }
  if (!meta.format || !opts.formats.has(meta.format)) {
    throw new UploadError(415, meta.format === "heif" && meta.compression === "hevc" ? HEIC_MESSAGE : opts.unsupportedMessage);
  }
  const keepPng = opts.keepTransparentPng && meta.format === "png" && meta.hasAlpha === true;
  try {
    const pipeline = sharp(buffer, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: opts.maxSide, height: opts.maxSide, fit: "inside", withoutEnlargement: true });
    const encoded = keepPng
      ? pipeline.png({ compressionLevel: 9, adaptiveFiltering: true })
      : pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: opts.quality, progressive: true, mozjpeg: true });
    const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
    return { data, ext: keepPng ? "png" : "jpg", mime: keepPng ? "image/png" : "image/jpeg", width: info.width, height: info.height };
  } catch {
    // Header parsed, but the pixel data is broken or truncated.
    throw new UploadError(415, opts.unsupportedMessage);
  }
}

function buildKey(filename: string, processed: Processed, folder = "") {
  const base = path.basename(filename || "bild", path.extname(filename || ""));
  const slug = (slugify(base) || "bild").slice(0, 60).replace(/-+$/, "") || "bild";
  const hash = crypto.createHash("sha1").update(processed.data).digest("hex").slice(0, 8);
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${folder}${yyyy}/${mm}/${slug}-${hash}.${processed.ext}`;
}

export function isValidUploadKey(key: string) {
  return KEY_RE.test(key);
}

/* ---------------- public API ---------------- */

export async function saveUpload({ buffer, filename }: SaveUploadInput): Promise<SaveUploadResult> {
  if (!buffer.length) throw new UploadError(400, "Die Datei ist leer.");
  if (buffer.length > MAX_UPLOAD_BYTES) throw new UploadError(413, "Die Datei ist zu groß (maximal 15 MB).");
  const processed = await processImage(buffer);
  const key = buildKey(filename, processed);
  await putObject(key, processed.data, processed.mime);
  return { url: publicUrl(key), key, width: processed.width, height: processed.height, bytes: processed.data.length };
}

/** Size check for one customer photo before anything is decoded. Returns an error message or null. */
export function reviewPhotoSizeError(size: number): string | null {
  if (size <= 0) return "Ein Foto ist leer.";
  if (size > MAX_REVIEW_PHOTO_BYTES) return "Ein Foto ist zu groß (maximal 10 MB pro Foto).";
  return null;
}

/**
 * Decodes a customer photo by its bytes (JPEG, PNG or WebP), rotates it upright,
 * drops EXIF/GPS, scales it to at most 1600 px and encodes JPEG q80.
 */
export async function processReviewPhoto(buffer: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const sizeError = reviewPhotoSizeError(buffer.length);
  if (sizeError) throw new UploadError(buffer.length ? 413 : 400, sizeError);
  const p = await processImage(buffer, REVIEW_PROCESS);
  return { data: p.data, width: p.width, height: p.height };
}

/** Stores an already processed review photo; `label` names the file (e.g. the product slug). */
export async function storeReviewPhoto(photo: { data: Buffer; width: number; height: number }, label: string): Promise<SaveUploadResult> {
  const processed: Processed = { data: photo.data, ext: "jpg", mime: "image/jpeg", width: photo.width, height: photo.height };
  const key = buildKey(label || "kundenfoto", processed, "reviews/");
  await putObject(key, processed.data, processed.mime);
  return { url: publicUrl(key), key, width: photo.width, height: photo.height, bytes: photo.data.length };
}

/** Removes a review photo (rejected review, or a photo the admin did not approve). Missing files are ignored. */
export async function deleteReviewPhoto(key: string): Promise<void> {
  if (!isValidReviewPhotoKey(key)) throw new UploadError(400, "Ungültiger Dateischlüssel.");
  try {
    await deleteObject(key);
  } catch (e) {
    if (e instanceof UploadError && e.status === 404) return;
    throw e;
  }
}

/** All admin uploads, newest first (review photos are not listed). */
export async function listUploads(): Promise<UploadItem[]> {
  const items: UploadItem[] = [];
  const driver = getUploadDriver();
  if (driver === "s3") {
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    const { bucket, prefix } = s3Config();
    let token: string | undefined;
    do {
      const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix ? `${prefix}/` : undefined, ContinuationToken: token, MaxKeys: 1000 }));
      for (const obj of res.Contents ?? []) {
        if (!obj.Key) continue;
        const key = prefix ? obj.Key.slice(prefix.length + 1) : obj.Key;
        if (!isValidUploadKey(key)) continue;
        items.push({ key, url: publicUrl(key), bytes: obj.Size ?? 0, modifiedAt: obj.LastModified?.toISOString() ?? "" });
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token && items.length < 5000);
  } else if (driver === "netlify") {
    const store = await blobStore();
    const { blobs } = await store.list();
    const keys = blobs.map((b) => b.key).filter(isValidUploadKey).slice(0, 2000);
    for (let i = 0; i < keys.length; i += 20) {
      const batch = await Promise.all(keys.slice(i, i + 20).map(async (key) => ({ key, meta: await store.getMetadata(key) })));
      for (const { key, meta } of batch) {
        const m = (meta?.metadata ?? {}) as BlobMeta;
        items.push({ key, url: publicUrl(key), bytes: Number(m.bytes) || 0, modifiedAt: typeof m.uploadedAt === "string" ? m.uploadedAt : "" });
      }
    }
  } else {
    for (const rel of await walk(LOCAL_ROOT)) {
      const key = rel.split(path.sep).join("/");
      if (!isValidUploadKey(key)) continue;
      const stat = await fs.stat(path.join(LOCAL_ROOT, rel));
      items.push({ key, url: publicUrl(key), bytes: stat.size, modifiedAt: stat.mtime.toISOString() });
    }
  }
  return items.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export async function deleteUpload(key: string): Promise<void> {
  if (!isValidUploadKey(key)) throw new UploadError(400, "Ungültiger Dateischlüssel.");
  await deleteObject(key);
}

/** Static assets shipped with the repo under public/images (read-only, for the media picker). */
export async function listStaticImages(): Promise<StaticImage[]> {
  const items: StaticImage[] = [];
  for (const rel of await walk(STATIC_ROOT)) {
    if (!STATIC_EXT.has(path.extname(rel).toLowerCase())) continue;
    const stat = await fs.stat(path.join(STATIC_ROOT, rel));
    items.push({ url: `/images/${rel.split(path.sep).join("/")}`, bytes: stat.size, modifiedAt: stat.mtime.toISOString() });
  }
  return items.sort((a, b) => a.url.localeCompare(b.url));
}

/** Recursive file listing relative to `root`; a missing root yields []. */
async function walk(root: string, rel = ""): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const child = rel ? path.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) out.push(...(await walk(root, child)));
    else if (entry.isFile()) out.push(child);
  }
  return out;
}

/* ---------------- outreach files (admin → Outreach) ---------------- */

/** One PDF attachment. The total per template (≤ 20 MB) is checked when the template is saved. */
export const MAX_OUTREACH_PDF_BYTES = 10 * 1024 * 1024;
/** Uploaded videos are linked from the mail, never attached. */
export const MAX_OUTREACH_VIDEO_BYTES = 50 * 1024 * 1024;
/** Sum of all attachments of one template. */
export const MAX_OUTREACH_ATTACHMENTS_BYTES = 20 * 1024 * 1024;

export type OutreachUploadPurpose = "attachment" | "header" | "poster" | "video";

export interface OutreachUploadResult {
  key: string;
  url: string;
  name: string;
  bytes: number;
  contentType: string;
  /** Poster only: the same image with a play button (what the mail shows). */
  playUrl?: string;
  playKey?: string;
}

export function isValidOutreachKey(key: string) {
  return OUTREACH_KEY_RE.test(key);
}

function outreachKey(filename: string, data: Buffer, ext: string, suffix = "") {
  const base = path.basename(filename || "datei", path.extname(filename || ""));
  const slug = ((slugify(base) || "datei").slice(0, 60).replace(/-+$/, "") || "datei") + suffix;
  const hash = crypto.createHash("sha1").update(data).digest("hex").slice(0, 8);
  const now = new Date();
  return `outreach/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${slug}-${hash}.${ext}`;
}

function sniffVideo(buffer: Buffer): "mp4" | "mov" | "webm" | null {
  if (buffer.length >= 4 && buffer.readUInt32BE(0) === 0x1a45dfa3) return "webm";
  if (buffer.length >= 12 && buffer.toString("latin1", 4, 8) === "ftyp") return buffer.toString("latin1", 8, 10) === "qt" ? "mov" : "mp4";
  return null;
}

const isPdf = (buffer: Buffer) => buffer.length > 5 && buffer.toString("latin1", 0, 5) === "%PDF-";

/** The poster with a centred play button burnt in – works in every mail client (no CSS overlays). */
async function posterWithPlayButton(image: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(image).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg().toBuffer({ resolveWithObject: true });
  const r = Math.round(Math.min(info.width, info.height) * 0.11);
  const cx = info.width / 2;
  const cy = info.height / 2;
  const tri = `${cx - r * 0.32},${cy - r * 0.5} ${cx - r * 0.32},${cy + r * 0.5} ${cx + r * 0.52},${cy}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}">
<rect width="100%" height="100%" fill="#12241b" fill-opacity="0.18"/>
<circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="#000" fill-opacity="0.18"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="#faf7f2" fill-opacity="0.94"/>
<polygon points="${tri}" fill="#1f3a2d"/>
</svg>`;
  return sharp(data).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 84, progressive: true, mozjpeg: true }).toBuffer();
}

/**
 * Stores a file for an outreach template:
 *  - attachment: PDF (bytes checked, stored as is, ≤ 10 MB) or image (re-encoded like admin uploads)
 *  - header / poster: image (re-encoded, max 2000 px); a poster also gets a play-button version
 *  - video: MP4/MOV/WebM (≤ 50 MB), stored as is and only linked from the mail
 */
export async function saveOutreachFile({ buffer, filename, purpose }: { buffer: Buffer; filename: string; purpose: OutreachUploadPurpose }): Promise<OutreachUploadResult> {
  if (!buffer.length) throw new UploadError(400, "Die Datei ist leer.");
  const name = path.basename(filename || "datei").slice(0, 120);

  if (purpose === "video") {
    if (buffer.length > MAX_OUTREACH_VIDEO_BYTES) throw new UploadError(413, "Das Video ist zu groß (maximal 50 MB). Tipp: das Video z. B. auf YouTube oder Vimeo hochladen und den Link einfügen.");
    const ext = sniffVideo(buffer);
    if (!ext) throw new UploadError(415, "Bitte ein Video als MP4, MOV oder WebM hochladen.");
    const contentType = OTHER_TYPES[ext];
    const key = outreachKey(name, buffer, ext);
    await putObject(key, buffer, contentType);
    return { key, url: publicUrl(key), name, bytes: buffer.length, contentType };
  }

  if (purpose === "attachment" && isPdf(buffer)) {
    if (buffer.length > MAX_OUTREACH_PDF_BYTES) throw new UploadError(413, "Die PDF-Datei ist zu groß (maximal 10 MB).");
    const key = outreachKey(name, buffer, "pdf");
    await putObject(key, buffer, "application/pdf");
    return { key, url: publicUrl(key), name: /\.pdf$/i.test(name) ? name : `${name}.pdf`, bytes: buffer.length, contentType: "application/pdf" };
  }

  if (buffer.length > MAX_UPLOAD_BYTES) throw new UploadError(413, "Die Datei ist zu groß (maximal 15 MB).");
  let processed: Processed;
  try {
    processed = await processImage(buffer);
  } catch (e) {
    if (purpose === "attachment" && e instanceof UploadError && e.status === 415) {
      throw new UploadError(415, "Als Anhang gehen PDF-Dateien und Bilder (JPEG, PNG, WebP, AVIF).");
    }
    throw e;
  }
  if (purpose === "header" || purpose === "poster") {
    // Mail-friendly crops: header 2:1, video poster 16:9 (a portrait photo would fill the whole screen).
    const [w, h] = purpose === "header" ? [1200, 600] : [1024, 576];
    const data = await sharp(processed.data).resize({ width: w, height: h, fit: "cover", position: "attention" }).jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true }).toBuffer();
    processed = { data, ext: "jpg", mime: "image/jpeg", width: w, height: h };
  }
  const key = outreachKey(name, processed.data, processed.ext);
  await putObject(key, processed.data, processed.mime);
  const imageName = name.replace(/\.[a-z0-9]+$/i, "") + `.${processed.ext}`;
  const result: OutreachUploadResult = { key, url: publicUrl(key), name: imageName, bytes: processed.data.length, contentType: processed.mime };
  if (purpose === "poster") {
    const play = await posterWithPlayButton(processed.data);
    const playKey = outreachKey(name, play, "jpg", "-play");
    await putObject(playKey, play, "image/jpeg");
    result.playKey = playKey;
    result.playUrl = publicUrl(playKey);
  }
  return result;
}

/** Bytes of a stored outreach file (to attach it to a mail); null when missing. */
export async function readOutreachFile(key: string): Promise<Buffer | null> {
  if (!isValidOutreachKey(key)) return null;
  if (getUploadDriver() === "s3") {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: s3Config().bucket, Key: objectKey(key) }));
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch (e) {
      if ((e as { name?: string }).name === "NoSuchKey") return null;
      throw e;
    }
  }
  const file = await readStoredMedia(key);
  return file ? Buffer.from(file.data) : null;
}

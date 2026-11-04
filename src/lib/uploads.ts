import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { slugify } from "@/lib/format";

/**
 * Upload storage for admin images (product photos, hero images, …).
 *
 * Two drivers, selected by environment:
 *  - `local` (default): files land in `public/uploads/<yyyy>/<mm>/<slug>-<hash>.<ext>`
 *    and are served by Next as `/uploads/…`. Persist the folder via a Docker volume.
 *  - `s3`: any S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, Hetzner, …) when
 *    S3_BUCKET + S3_REGION + S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY are set.
 *    Optional: S3_ENDPOINT (R2/MinIO), S3_PREFIX (default "uploads"),
 *    S3_PUBLIC_URL or UPLOADS_PUBLIC_HOST for the public base URL.
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
const STATIC_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);

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

export type UploadDriver = "local" | "s3";

export function getUploadDriver(): UploadDriver {
  const { S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  return S3_BUCKET && S3_REGION && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY ? "s3" : "local";
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

function publicUrl(key: string) {
  if (getUploadDriver() === "local") return `/uploads/${key}`;
  return `${s3Config().publicBase}/${objectKey(key)}`;
}

/* ---------------- image processing ---------------- */

interface Processed { data: Buffer; ext: "jpg" | "png"; mime: string; width: number; height: number }

/**
 * Sniff, auto-rotate, downscale to MAX_SIDE_PX and re-encode. Transparent PNGs stay
 * PNG, everything else becomes a progressive JPEG. next/image creates the
 * responsive variants at request time, so nothing else is generated here.
 */
async function processImage(buffer: Buffer): Promise<Processed> {
  let meta: Metadata;
  try {
    meta = await sharp(buffer, { limitInputPixels: 80_000_000 }).metadata();
  } catch {
    throw new UploadError(415, "Die Datei ist kein unterstütztes Bild (JPEG, PNG, WebP oder AVIF).");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new UploadError(415, "Die Datei ist kein unterstütztes Bild (JPEG, PNG, WebP oder AVIF).");
  }
  const keepPng = meta.format === "png" && meta.hasAlpha === true;
  const pipeline = sharp(buffer, { limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: MAX_SIDE_PX, height: MAX_SIDE_PX, fit: "inside", withoutEnlargement: true });
  const encoded = keepPng
    ? pipeline.png({ compressionLevel: 9, adaptiveFiltering: true })
    : pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true });
  const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
  return { data, ext: keepPng ? "png" : "jpg", mime: keepPng ? "image/png" : "image/jpeg", width: info.width, height: info.height };
}

function buildKey(filename: string, processed: Processed) {
  const base = path.basename(filename || "bild", path.extname(filename || ""));
  const slug = (slugify(base) || "bild").slice(0, 60).replace(/-+$/, "") || "bild";
  const hash = crypto.createHash("sha1").update(processed.data).digest("hex").slice(0, 8);
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}/${slug}-${hash}.${processed.ext}`;
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

  if (getUploadDriver() === "s3") {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    await client.send(new PutObjectCommand({
      Bucket: s3Config().bucket,
      Key: objectKey(key),
      Body: processed.data,
      ContentType: processed.mime,
      CacheControl: "public, max-age=31536000, immutable",
    }));
  } else {
    const target = path.join(LOCAL_ROOT, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, processed.data);
  }

  return { url: publicUrl(key), key, width: processed.width, height: processed.height, bytes: processed.data.length };
}

/** All uploads, newest first. */
export async function listUploads(): Promise<UploadItem[]> {
  const items: UploadItem[] = [];
  if (getUploadDriver() === "s3") {
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
  if (getUploadDriver() === "s3") {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    await client.send(new DeleteObjectCommand({ Bucket: s3Config().bucket, Key: objectKey(key) }));
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

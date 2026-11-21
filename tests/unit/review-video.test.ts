import { describe, expect, it } from "vitest";
import {
  chunkCount,
  clampRange,
  expectedChunkSize,
  formatClipDuration,
  mapRangeToChunks,
  MAX_REVIEW_VIDEO_BYTES,
  MAX_REVIEW_VIDEO_CHUNKS,
  parseRange,
  publicReviewVideo,
  REVIEW_VIDEO_CHUNK_BYTES,
  REVIEW_VIDEO_KEY_RE,
  reviewVideoKeys,
  sniffVideoContainer,
  videoMagicMatches,
  videoStartError,
} from "@/lib/review-video";
import type { Review } from "@/types";

const ascii = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
const ftyp = (brand: string) => new Uint8Array([0, 0, 0, 0x20, ...ascii("ftyp"), ...ascii(brand), 0, 0, 0, 0]);
const EBML = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);

describe("chunk arithmetic", () => {
  it("keeps every chunk below Netlify's request limit, base64 included", () => {
    expect(REVIEW_VIDEO_CHUNK_BYTES).toBeLessThanOrEqual(4 * 1024 * 1024);
    expect(Math.ceil(REVIEW_VIDEO_CHUNK_BYTES / 3) * 4).toBeLessThan(6 * 1000 * 1000);
    expect(MAX_REVIEW_VIDEO_CHUNKS).toBe(Math.ceil(MAX_REVIEW_VIDEO_BYTES / REVIEW_VIDEO_CHUNK_BYTES));
  });

  it("splits a file into full chunks and a shorter last one", () => {
    const size = 2 * REVIEW_VIDEO_CHUNK_BYTES + 123;
    expect(chunkCount(size)).toBe(3);
    expect(expectedChunkSize(size, 0)).toBe(REVIEW_VIDEO_CHUNK_BYTES);
    expect(expectedChunkSize(size, 1)).toBe(REVIEW_VIDEO_CHUNK_BYTES);
    expect(expectedChunkSize(size, 2)).toBe(123);
    expect(expectedChunkSize(size, 3)).toBe(-1);
    expect(expectedChunkSize(size, -1)).toBe(-1);
    expect(expectedChunkSize(size, 0.5)).toBe(-1);
    expect(chunkCount(REVIEW_VIDEO_CHUNK_BYTES)).toBe(1);
    expect(expectedChunkSize(REVIEW_VIDEO_CHUNK_BYTES, 0)).toBe(REVIEW_VIDEO_CHUNK_BYTES);
    expect(chunkCount(0)).toBe(0);
  });

  it("names chunks, manifest and the public video path", () => {
    const keys = reviewVideoKeys("0123456789abcdef01234567");
    expect(keys.chunk(7)).toBe("review-videos/0123456789abcdef01234567/chunk-007");
    expect(keys.manifest).toBe("review-videos/0123456789abcdef01234567/manifest.json");
    expect(keys.video("video/quicktime")).toBe("review-videos/0123456789abcdef01234567/video.mov");
    expect(REVIEW_VIDEO_KEY_RE.test(keys.video("video/mp4"))).toBe(true);
    expect(REVIEW_VIDEO_KEY_RE.test(keys.chunk(0))).toBe(false);
    expect(REVIEW_VIDEO_KEY_RE.test(keys.manifest)).toBe(false);
    expect(REVIEW_VIDEO_KEY_RE.test("review-videos/../video.mp4")).toBe(false);
  });
});

describe("videoStartError", () => {
  const ok = { size: 5_000_000, type: "video/mp4", duration: 12.3 };
  it("accepts MP4, MOV and WebM up to 60 MB and 15 s (+0.5 s tolerance)", () => {
    expect(videoStartError(ok)).toBeNull();
    expect(videoStartError({ ...ok, type: "video/quicktime" })).toBeNull();
    expect(videoStartError({ ...ok, type: "video/webm", duration: 15.5 })).toBeNull();
    expect(videoStartError({ ...ok, size: MAX_REVIEW_VIDEO_BYTES })).toBeNull();
  });
  it("rejects other types, empty or too large files and long or unknown durations", () => {
    expect(videoStartError({ ...ok, type: "video/x-msvideo" })).toMatch(/MP4, MOV oder WebM/);
    expect(videoStartError({ ...ok, type: "image/jpeg" })).toMatch(/MP4/);
    expect(videoStartError({ ...ok, size: 0 })).toMatch(/leer/);
    expect(videoStartError({ ...ok, size: 1.5 })).toMatch(/leer/);
    expect(videoStartError({ ...ok, size: MAX_REVIEW_VIDEO_BYTES + 1 })).toMatch(/60 MB/);
    expect(videoStartError({ ...ok, duration: 15.51 })).toMatch(/15 Sekunden/);
    expect(videoStartError({ ...ok, duration: Number.NaN })).toMatch(/Länge/);
    expect(videoStartError({ ...ok, duration: Infinity })).toMatch(/Länge/);
    expect(videoStartError({ ...ok, duration: 0 })).toMatch(/Länge/);
  });
});

describe("magic bytes", () => {
  it("recognises ISO-BMFF (MP4/MOV) and EBML (WebM)", () => {
    expect(sniffVideoContainer(ftyp("isom"))).toBe("mp4");
    expect(sniffVideoContainer(ftyp("mp42"))).toBe("mp4");
    expect(sniffVideoContainer(ftyp("qt  "))).toBe("mov");
    expect(sniffVideoContainer(EBML)).toBe("webm");
    expect(sniffVideoContainer(ascii("<html><body>"))).toBeNull();
    expect(sniffVideoContainer(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
    expect(sniffVideoContainer(new Uint8Array(3))).toBeNull();
  });
  it("matches the declared content type (MP4 and MOV share the container)", () => {
    expect(videoMagicMatches("video/mp4", ftyp("isom"))).toBe(true);
    expect(videoMagicMatches("video/mp4", ftyp("qt  "))).toBe(true);
    expect(videoMagicMatches("video/quicktime", ftyp("qt  "))).toBe(true);
    expect(videoMagicMatches("video/quicktime", EBML)).toBe(false);
    expect(videoMagicMatches("video/webm", EBML)).toBe(true);
    expect(videoMagicMatches("video/webm", ftyp("isom"))).toBe(false);
    expect(videoMagicMatches("video/mp4", ascii("GIF89a......"))).toBe(false);
  });
});

describe("parseRange", () => {
  const total = 10_000;
  it("parses closed, open and suffix ranges", () => {
    expect(parseRange("bytes=0-1", total)).toEqual({ start: 0, end: 1 });
    expect(parseRange("bytes=0-", total)).toEqual({ start: 0, end: 9_999 });
    expect(parseRange("bytes=500-999", total)).toEqual({ start: 500, end: 999 });
    expect(parseRange("bytes=9000-20000", total)).toEqual({ start: 9_000, end: 9_999 });
    expect(parseRange("bytes=-500", total)).toEqual({ start: 9_500, end: 9_999 });
    expect(parseRange("bytes=-50000", total)).toEqual({ start: 0, end: 9_999 });
    expect(parseRange("BYTES = 3 - 4", total)).toEqual({ start: 3, end: 4 });
  });
  it("ignores missing, malformed and multi-range headers (→ full response)", () => {
    expect(parseRange(null, total)).toBeNull();
    expect(parseRange("", total)).toBeNull();
    expect(parseRange("bytes=-", total)).toBeNull();
    expect(parseRange("items=0-5", total)).toBeNull();
    expect(parseRange("bytes=0-1,5-6", total)).toBeNull();
    expect(parseRange("bytes=9-3", total)).toBeNull();
  });
  it("reports unsatisfiable ranges", () => {
    expect(parseRange("bytes=10000-", total)).toBe("unsatisfiable");
    expect(parseRange("bytes=-0", total)).toBe("unsatisfiable");
    expect(parseRange("bytes=0-1", 0)).toBe("unsatisfiable");
  });
  it("caps a range to one chunk's worth of bytes", () => {
    expect(clampRange({ start: 0, end: 59_999_999 })).toEqual({ start: 0, end: REVIEW_VIDEO_CHUNK_BYTES - 1 });
    expect(clampRange({ start: 0, end: 1 })).toEqual({ start: 0, end: 1 });
    expect(clampRange({ start: 100, end: 1_000 }, 10)).toEqual({ start: 100, end: 109 });
  });
});

describe("mapRangeToChunks", () => {
  const sizes = [100, 100, 50];
  it("maps a range inside one chunk", () => {
    expect(mapRangeToChunks(sizes, { start: 0, end: 1 })).toEqual([{ index: 0, from: 0, to: 1 }]);
    expect(mapRangeToChunks(sizes, { start: 120, end: 150 })).toEqual([{ index: 1, from: 20, to: 50 }]);
    expect(mapRangeToChunks(sizes, { start: 249, end: 249 })).toEqual([{ index: 2, from: 49, to: 49 }]);
  });
  it("spans chunk boundaries", () => {
    expect(mapRangeToChunks(sizes, { start: 90, end: 109 })).toEqual([
      { index: 0, from: 90, to: 99 },
      { index: 1, from: 0, to: 9 },
    ]);
    expect(mapRangeToChunks(sizes, { start: 0, end: 249 })).toEqual([
      { index: 0, from: 0, to: 99 },
      { index: 1, from: 0, to: 99 },
      { index: 2, from: 0, to: 49 },
    ]);
    expect(mapRangeToChunks(sizes, { start: 100, end: 199 })).toEqual([{ index: 1, from: 0, to: 99 }]);
  });
  it("covers exactly the requested number of bytes", () => {
    const real = [4_000_000, 4_000_000, 1_234];
    for (const [start, end] of [[0, 0], [3_999_999, 4_000_000], [123, 8_001_233], [8_000_000, 8_001_233]]) {
      const slices = mapRangeToChunks(real, { start, end });
      expect(slices.reduce((n, s) => n + s.to - s.from + 1, 0)).toBe(end - start + 1);
    }
  });
});

describe("publicReviewVideo", () => {
  const base: Review = { id: "r1", name: "Anna M.", rating: 5, text: "Schön", date: "2026-11-18", verified: true, demo: false, video: { src: "/media/review-videos/0123456789abcdef01234567/video.mp4", poster: "/media/reviews/2026/11/x-video-1a2b3c4d.jpg", alt: "Kundenvideo", duration: 9.4 } };
  it("shows the video of real, verified reviews only", () => {
    expect(publicReviewVideo(base)).toEqual(base.video);
    expect(publicReviewVideo({ ...base, demo: true })).toBeNull();
    expect(publicReviewVideo({ ...base, verified: false })).toBeNull();
    expect(publicReviewVideo({ ...base, video: undefined })).toBeNull();
    expect(publicReviewVideo({ ...base, video: { ...base.video!, src: "" } })).toBeNull();
  });
  it("formats the clip length", () => {
    expect(formatClipDuration(9.4)).toBe("0:09");
    expect(formatClipDuration(14.6)).toBe("0:15");
    expect(formatClipDuration(75)).toBe("1:15");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));

const ORDER = {
  id: "BQ-7K2M9Q",
  token: "0123456789abcdef01234567",
  status: "delivered",
  history: [{ status: "delivered", at: "2026-11-16T10:00:00.000Z" }],
  customer: { firstName: "Anna", lastName: "Muster", email: "anna@example.com", phone: "" },
  lines: [{ productId: "p-red", productName: "Red Passion" }],
};

const docs = vi.hoisted(() => new Map<string, unknown>());
vi.mock("@/lib/cms", () => ({
  getOrderById: vi.fn(async (id: string) => (id === "BQ-7K2M9Q" ? structuredClone(ORDER) : null)),
  getOrders: vi.fn(async () => [ORDER]),
  updateOrder: vi.fn(async (_id: string, fn: (o: unknown) => unknown) => void docs.set("order-patch", fn(structuredClone(ORDER)))),
  getAllProducts: vi.fn(async () => [{ id: "p-red", slug: "red-passion", name: "Red Passion" }]),
  readData: vi.fn(async (name: string, fallback: unknown) => structuredClone(docs.has(name) ? docs.get(name) : fallback)),
  writeData: vi.fn(async (name: string, value: unknown) => void docs.set(name, structuredClone(value))),
}));
vi.mock("@/lib/mail", () => ({ sendReviewRequest: vi.fn() }));

/** Real processing (sharp), fake storage – nothing is written to public/uploads. */
const stored = vi.hoisted(() => [] as string[]);
vi.mock("@/lib/uploads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/uploads")>();
  return {
    ...actual,
    storeReviewPhoto: vi.fn(async (photo: { data: Buffer; width: number; height: number }, label: string) => {
      const key = `reviews/2026/11/${label}-${String(stored.length).padStart(8, "0")}.jpg`;
      stored.push(key);
      return { key, url: `/media/${key}`, width: photo.width, height: photo.height, bytes: photo.data.length };
    }),
    deleteReviewPhoto: vi.fn(async () => undefined),
  };
});

import { POST } from "@/app/api/reviews/route";
import { rateLimitInternals } from "@/lib/rate-limit";
import { REVIEW_CONSENT_TEXT } from "@/lib/review-submission";
import type { ReviewRequestRecord, ReviewSubmission } from "@/types/reminders";

const URL_ = "http://localhost:3000/api/reviews";
let ip = 0;
const nextIp = () => `203.0.113.${++ip % 250}`;

function multipart(fields: Record<string, string>, photos: Blob[] = [], from = nextIp()) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  photos.forEach((p, i) => form.append("photos", p, `foto-${i + 1}.jpg`));
  return new Request(URL_, { method: "POST", headers: { "x-forwarded-for": from }, body: form });
}

const VALID = { order: ORDER.id, token: ORDER.token, name: "Anna M.", rating: "5", text: "Wunderschöne Rosen, pünktlich da.", consent: "true", website: "" };
const jpeg = async () => new Blob([new Uint8Array(await sharp({ create: { width: 900, height: 600, channels: 3, background: "#aa3344" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer())], { type: "image/jpeg" });

beforeEach(() => {
  docs.clear();
  stored.length = 0;
  rateLimitInternals.clear();
  vi.clearAllMocks();
});

describe("POST /api/reviews", () => {
  it("requires the consent checkbox (multipart and JSON)", async () => {
    const res = await POST(multipart({ ...VALID, consent: "false" }));
    expect(res.status).toBe(422);
    expect((await res.json()).errors).toHaveProperty("consent");

    const json = new Request(URL_, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": nextIp() }, body: JSON.stringify({ ...VALID, rating: 5, consent: undefined }) });
    const res2 = await POST(json);
    expect(res2.status).toBe(422);
    expect((await res2.json()).errors).toHaveProperty("consent");
    expect(docs.size).toBe(0);
  });

  it("stores a review with photos and the consent with a timestamp", async () => {
    const res = await POST(multipart(VALID, [await jpeg(), await jpeg()]));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, photos: 2 });

    const [submission] = docs.get("review-submissions") as ReviewSubmission[];
    expect(submission).toMatchObject({ orderId: ORDER.id, productSlug: "red-passion", rating: 5, status: "pending", consent: { text: REVIEW_CONSENT_TEXT } });
    expect(submission.consent?.at).toBe(submission.createdAt);
    expect(submission.photos).toHaveLength(2);
    // Rotated by EXIF orientation 6: 900×600 → 600×900.
    expect(submission.photos?.[0]).toMatchObject({ url: expect.stringMatching(/^\/media\/reviews\//), width: 600, height: 900 });

    const [record] = docs.get("review-requests") as ReviewRequestRecord[];
    expect(record).toMatchObject({ orderId: ORDER.id, submittedAt: submission.createdAt, consent: submission.consent });
  });

  it("still accepts a review without photos", async () => {
    const res = await POST(multipart(VALID));
    expect(res.status).toBe(201);
    expect((docs.get("review-submissions") as ReviewSubmission[])[0].photos).toBeUndefined();
  });

  it("stores the answer to „Wie hast du uns gefunden?“ on the order", async () => {
    const res = await POST(multipart({ ...VALID, found_via: "sonstiges", found_via_other: "Flyer im Café" }));
    expect(res.status).toBe(201);
    expect((docs.get("order-patch") as { foundVia?: unknown }).foundVia).toMatchObject({ source: "sonstiges", other: "Flyer im Café" });
  });

  it("refuses more than three photos and stores nothing", async () => {
    const p = await jpeg();
    const res = await POST(multipart(VALID, [p, p, p, p]));
    expect(res.status).toBe(422);
    expect((await res.json()).errors.photos).toMatch(/höchstens 3/);
    expect(stored).toHaveLength(0);
  });

  it("refuses a file that is not an image, even with an image name and type", async () => {
    const fake = new Blob(["<html>not an image</html>"], { type: "image/jpeg" });
    const res = await POST(multipart(VALID, [await jpeg(), fake]));
    expect(res.status).toBe(415);
    expect(stored).toHaveLength(0);
    expect(docs.has("review-submissions")).toBe(false);
  });

  it("checks the order token before touching the photos", async () => {
    const res = await POST(multipart({ ...VALID, token: "wrong" }, [await jpeg()]));
    expect(res.status).toBe(404);
    expect(stored).toHaveLength(0);
  });

  it("rejects a declared body larger than the photo limit", async () => {
    const req = new Request(URL_, { method: "POST", headers: { "x-forwarded-for": nextIp(), "content-length": String(40 * 1024 * 1024), "content-type": "multipart/form-data; boundary=x" }, body: "x" });
    expect((await POST(req)).status).toBe(413);
  });

  it("rate-limits before parsing the body", async () => {
    const from = "198.51.100.9";
    for (let i = 0; i < 5; i++) await POST(multipart({ ...VALID, consent: "false" }, [], from));
    const res = await POST(new Request(URL_, { method: "POST", headers: { "x-forwarded-for": from, "content-type": "application/json" }, body: "{broken" }));
    expect(res.status).toBe(429);
  });

  it("accepts only one review per order", async () => {
    expect((await POST(multipart(VALID))).status).toBe(201);
    expect((await POST(multipart(VALID))).status).toBe(409);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types";

vi.mock("server-only", () => ({}));

/** In-memory data/*.json documents. */
const docs = vi.hoisted(() => new Map<string, unknown>());
const orders = vi.hoisted(() => [] as unknown[]);
vi.mock("@/lib/cms", () => ({
  getOrders: vi.fn(async () => orders),
  readData: vi.fn(async (name: string, fallback: unknown) => structuredClone(docs.has(name) ? docs.get(name) : fallback)),
  writeData: vi.fn(async (name: string, value: unknown) => void docs.set(name, structuredClone(value))),
}));
const mail = vi.hoisted(() => ({ sendReviewRequest: vi.fn() }));
vi.mock("@/lib/mail", () => mail);

import {
  deliveredAt,
  findOrdersDueForReviewRequest,
  getReviewRequests,
  isDueForReviewRequest,
  MANUAL_RESEND_GUARD_MS,
  MIN_DAYS_AFTER_DELIVERY,
  sendManualReviewRequest,
  submissionToReview,
  withRequestSent,
} from "@/lib/mail/review-requests";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-17T10:00:00.000Z");

function order(overrides: Partial<Order> = {}, deliveredMsAgo: number | null = DAY): Order {
  const history: Order["history"] = [{ status: "paid" as Order["status"], at: "2026-11-01T08:00:00.000Z" }];
  if (deliveredMsAgo !== null) history.push({ status: "delivered", at: new Date(NOW - deliveredMsAgo).toISOString() });
  return {
    id: "BQ-ABC123",
    token: "0123456789abcdef01234567",
    createdAt: "2026-11-01T08:00:00.000Z",
    status: deliveredMsAgo === null ? ("paid" as Order["status"]) : "delivered",
    history,
    customer: { firstName: "Anna", lastName: "Muster", email: "anna@example.com", phone: "" },
    lines: [],
    ...overrides,
  } as Order;
}

beforeEach(() => {
  docs.clear();
  orders.length = 0;
  vi.clearAllMocks();
  mail.sendReviewRequest.mockResolvedValue({ sent: true, provider: "smtp" });
});

describe("due-date rule (from day 1 after delivery)", () => {
  it("starts one day after delivery", () => {
    expect(MIN_DAYS_AFTER_DELIVERY).toBe(1);
    const none = new Set<string>();
    expect(isDueForReviewRequest(order({}, 12 * 3_600_000), none, NOW)).toBe(false);
    expect(isDueForReviewRequest(order({}, DAY - 60_000), none, NOW)).toBe(false);
    expect(isDueForReviewRequest(order({}, DAY), none, NOW)).toBe(true);
    expect(isDueForReviewRequest(order({}, 2 * DAY), none, NOW)).toBe(true);
    expect(isDueForReviewRequest(order({}, 30 * DAY), none, NOW)).toBe(true);
    expect(isDueForReviewRequest(order({}, 30 * DAY + 3_600_000), none, NOW)).toBe(false);
  });

  it("skips orders that are not delivered, have no e-mail or were already handled", () => {
    expect(isDueForReviewRequest(order({}, null), new Set(), NOW)).toBe(false);
    expect(isDueForReviewRequest(order({ customer: { firstName: "A", lastName: "B", email: "", phone: "" } }, 2 * DAY), new Set(), NOW)).toBe(false);
    expect(isDueForReviewRequest(order({}, 2 * DAY), new Set(["BQ-ABC123"]), NOW)).toBe(false);
  });

  it("takes the moment the order became delivered, not later notes with the same status", () => {
    const o = order({}, 3 * DAY);
    o.history.push({ status: "delivered", at: new Date(NOW - 60_000).toISOString(), note: "Mail erneut gesendet" });
    expect(deliveredAt(o)).toBe(new Date(NOW - 3 * DAY).toISOString());
    expect(isDueForReviewRequest(o, new Set(), NOW)).toBe(true);
  });

  it("uses the latest delivery when the status went back and forth", () => {
    const o = order({}, 5 * DAY);
    o.history.push({ status: "out_for_delivery" as Order["status"], at: new Date(NOW - 4 * DAY).toISOString() });
    o.history.push({ status: "delivered", at: new Date(NOW - 3_600_000).toISOString() });
    expect(deliveredAt(o)).toBe(new Date(NOW - 3_600_000).toISOString());
    expect(isDueForReviewRequest(o, new Set(), NOW)).toBe(false);
  });
});

describe("withRequestSent", () => {
  it("keeps one record per order and counts the sends", () => {
    let records = withRequestSent([], "BQ-1", "cron", "2026-11-10T07:30:00.000Z");
    records = withRequestSent(records, "BQ-1", "admin", "2026-11-12T09:00:00.000Z");
    expect(records).toEqual([{ orderId: "BQ-1", sentAt: "2026-11-12T09:00:00.000Z", sentBy: "admin", sendCount: 2 }]);
  });

  it("keeps submittedAt and consent of an existing record", () => {
    const records = withRequestSent([{ orderId: "BQ-1", submittedAt: "x", consent: { at: "x", text: "t" } }], "BQ-1", "admin", "y");
    expect(records[0]).toMatchObject({ submittedAt: "x", consent: { at: "x", text: "t" }, sentAt: "y", sendCount: 1 });
  });
});

describe("sendManualReviewRequest", () => {
  it("sends, records sentAt and keeps the cron from sending again", async () => {
    const o = order({}, 2 * DAY);
    orders.push(o);
    expect(await findOrdersDueForReviewRequest(NOW)).toHaveLength(1);

    const r = await sendManualReviewRequest(o, NOW);
    expect(r).toMatchObject({ ok: true, sentAt: new Date(NOW).toISOString(), notDelivered: false });
    expect(mail.sendReviewRequest).toHaveBeenCalledTimes(1);
    expect(await getReviewRequests()).toEqual([{ orderId: o.id, sentAt: new Date(NOW).toISOString(), sentBy: "admin", sendCount: 1 }]);
    expect(await findOrdersDueForReviewRequest(NOW + DAY)).toHaveLength(0);
  });

  it("is idempotent: a second click right after does not send again", async () => {
    const o = order({}, 2 * DAY);
    await sendManualReviewRequest(o, NOW);
    const again = await sendManualReviewRequest(o, NOW + 5_000);
    expect(again).toMatchObject({ ok: false, reason: "recently-sent" });
    expect(mail.sendReviewRequest).toHaveBeenCalledTimes(1);
    expect(await getReviewRequests()).toHaveLength(1);
  });

  it("allows a deliberate resend later, still with one record", async () => {
    const o = order({}, 2 * DAY);
    await sendManualReviewRequest(o, NOW);
    const later = await sendManualReviewRequest(o, NOW + MANUAL_RESEND_GUARD_MS + 1);
    expect(later.ok).toBe(true);
    expect(mail.sendReviewRequest).toHaveBeenCalledTimes(2);
    const records = await getReviewRequests();
    expect(records).toHaveLength(1);
    expect(records[0].sendCount).toBe(2);
  });

  it("works before delivery but says so", async () => {
    const r = await sendManualReviewRequest(order({}, null), NOW);
    expect(r).toMatchObject({ ok: true, notDelivered: true });
  });

  it("refuses without e-mail, for cancelled orders and when the customer already reviewed", async () => {
    expect(await sendManualReviewRequest(order({ customer: { firstName: "A", lastName: "B", email: "", phone: "" } }), NOW)).toMatchObject({ ok: false, reason: "no-email" });
    expect(await sendManualReviewRequest(order({ status: "cancelled" as Order["status"] }), NOW)).toMatchObject({ ok: false, reason: "cancelled" });
    docs.set("review-requests", [{ orderId: "BQ-ABC123", submittedAt: "2026-11-16T10:00:00.000Z" }]);
    expect(await sendManualReviewRequest(order(), NOW)).toMatchObject({ ok: false, reason: "reviewed" });
    expect(mail.sendReviewRequest).not.toHaveBeenCalled();
  });

  it("records nothing when the mail fails", async () => {
    mail.sendReviewRequest.mockResolvedValue({ sent: false, provider: "smtp", error: "timeout" });
    const r = await sendManualReviewRequest(order(), NOW);
    expect(r).toMatchObject({ ok: false, reason: "mail-failed" });
    expect(await getReviewRequests()).toEqual([]);
  });
});

describe("submissionToReview", () => {
  const submission = {
    id: "RS-1", createdAt: "2026-11-16T10:00:00.000Z", orderId: "BQ-1", productSlug: "red-passion", name: "Anna M.", rating: 5 as const, text: "Wunderschön, danke!", status: "pending" as const,
    photos: [
      { key: "reviews/2026/11/red-passion-aaaaaaaa.jpg", url: "/media/reviews/2026/11/red-passion-aaaaaaaa.jpg", width: 1200, height: 1600 },
      { key: "reviews/2026/11/red-passion-bbbbbbbb.jpg", url: "/media/reviews/2026/11/red-passion-bbbbbbbb.jpg", width: 1600, height: 1200 },
    ],
  };

  it("publishes only the approved photos with a descriptive alt text", () => {
    const review = submissionToReview(submission, "r9", { photoKeys: ["reviews/2026/11/red-passion-bbbbbbbb.jpg"], productName: "Red Passion" });
    expect(review).toMatchObject({ id: "r9", verified: true, demo: false, photos: [{ src: "/media/reviews/2026/11/red-passion-bbbbbbbb.jpg", alt: "Kundenfoto zu Red Passion" }] });
  });

  it("publishes no photos when none are approved", () => {
    expect(submissionToReview(submission, "r9", { photoKeys: [] }).photos).toBeUndefined();
    expect(submissionToReview(submission, "r9").photos).toBeUndefined();
  });

  it("publishes the video only when the admin approved it", () => {
    const video = {
      id: "0123456789abcdef01234567", url: "/media/review-videos/0123456789abcdef01234567/video.mp4", contentType: "video/mp4", bytes: 9_000_000, duration: 12.4,
      posterKey: "reviews/2026/11/red-passion-video-cccccccc.jpg", posterUrl: "/media/reviews/2026/11/red-passion-video-cccccccc.jpg", width: 720, height: 1280,
    };
    const withVideo = { ...submission, video };
    expect(submissionToReview(withVideo, "r9", { video: true, productName: "Red Passion" }).video).toEqual({
      src: video.url, poster: video.posterUrl, alt: "Kundenvideo zu Red Passion", duration: 12.4, width: 720, height: 1280,
    });
    expect(submissionToReview(withVideo, "r9", { video: false }).video).toBeUndefined();
    expect(submissionToReview(withVideo, "r9").video).toBeUndefined();
    expect(submissionToReview(submission, "r9", { video: true }).video).toBeUndefined();
  });
});

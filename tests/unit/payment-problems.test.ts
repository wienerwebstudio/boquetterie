import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Hist = { status: string; at: string; note?: string };
const state = vi.hoisted(() => ({ order: null as null | { id: string; token: string; status: string; payment: { status: string }; history: Hist[] } }));
vi.mock("@/lib/cms", () => ({
  getOrderById: vi.fn(async (id: string) => (state.order && id === state.order.id ? structuredClone(state.order) : null)),
  updateOrder: vi.fn(async (_id: string, fn: (o: unknown) => unknown) => {
    state.order = fn(structuredClone(state.order)) as typeof state.order;
    return state.order;
  }),
}));
const notice = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/lib/mail", () => ({ sendPaymentProblemNotice: notice }));

import { POST } from "@/app/api/payments/stripe/client-event/route";
import { walletUsable } from "@/components/checkout/use-payment-methods";

const TOKEN = "0123456789abcdef01234567";
let ip = 0;
const post = (body: unknown) =>
  POST(new Request("http://localhost:3000/api/payments/stripe/client-event", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${++ip % 250}`, "user-agent": "Mozilla/5.0 (iPhone) CriOS/140" },
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  notice.mockClear();
  state.order = { id: "BQ-TEST01", token: TOKEN, status: "pending", payment: { status: "pending" }, history: [{ status: "pending", at: "2026-11-18T10:00:00.000Z" }] };
});

describe("client payment problem reports", () => {
  it("notes the problem in the order and mails the team once", async () => {
    const r1 = await post({ orderId: "bq-test01", token: TOKEN, kind: "load_timeout", method: "apple_pay" });
    expect(r1.status).toBe(200);
    const r2 = await post({ orderId: "BQ-TEST01", token: TOKEN, kind: "confirm_error", method: "klarna", message: "invalid_request_error\nfoo" });
    expect(r2.status).toBe(200);
    const notes = state.order!.history.map((h) => h.note).filter(Boolean);
    expect(notes).toHaveLength(2);
    expect(notes[0]).toContain("Zahlungsfeld nach 20 s nicht geladen (apple_pay)");
    expect(notes[0]).toContain("Gerät: Mozilla/5.0 (iPhone)");
    expect(notes[1]).toContain("invalid_request_error foo");
    expect(notice).toHaveBeenCalledTimes(1);
  });

  it("rejects a wrong token or unknown kind and ignores paid orders", async () => {
    expect((await post({ orderId: "BQ-TEST01", token: "x".repeat(24), kind: "load_error" })).status).toBe(404);
    expect((await post({ orderId: "BQ-TEST01", token: TOKEN, kind: "something" })).status).toBe(400);
    state.order!.payment.status = "paid";
    expect((await post({ orderId: "BQ-TEST01", token: TOKEN, kind: "load_error" })).status).toBe(200);
    expect(state.order!.history).toHaveLength(1);
    expect(notice).not.toHaveBeenCalled();
  });

  it("caps the notes per order at five", async () => {
    for (let i = 0; i < 8; i++) await post({ orderId: "BQ-TEST01", token: TOKEN, kind: "load_error" });
    expect(state.order!.history.filter((h) => h.note)).toHaveLength(5);
  });
});

describe("walletUsable", () => {
  const iphone = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/140" };
  const android = { userAgent: "Mozilla/5.0 (Linux; Android 15) Chrome/140" };

  it("keeps card, klarna and eps everywhere", () => {
    for (const id of ["card", "klarna", "eps"]) expect(walletUsable(id, iphone)).toBe(true);
  });

  it("hides Google Pay on iOS, keeps it on Android", () => {
    expect(walletUsable("google_pay", iphone)).toBe(false);
    expect(walletUsable("google_pay", android)).toBe(true);
  });

  it("shows Apple Pay only where the browser supports it", () => {
    const w = globalThis as unknown as { window?: unknown };
    const prev = w.window;
    try {
      w.window = {};
      expect(walletUsable("apple_pay", iphone)).toBe(false);
      w.window = { ApplePaySession: { canMakePayments: () => true } };
      expect(walletUsable("apple_pay", iphone)).toBe(true);
    } finally {
      w.window = prev;
    }
  });
});

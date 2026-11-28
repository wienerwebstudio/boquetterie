import { beforeEach, describe, expect, it, vi } from "vitest";
import { paymentNoteText, submitFailureReason } from "@/lib/payment-note";

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

import { POST } from "@/app/api/orders/payment-note/route";

const TOKEN = "0123456789abcdef01234567";
let ip = 0;
const post = (body: unknown, fixedIp?: string) =>
  POST(new Request("http://localhost:3000/api/orders/payment-note", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": fixedIp ?? `203.0.113.${++ip % 250}` },
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  state.order = { id: "BQ-NOTE01", token: TOKEN, status: "received", payment: { status: "pending" }, history: [{ status: "received", at: "2026-11-20T10:00:00.000Z" }] };
});

describe("submit() failure classification", () => {
  it("tells incomplete fields from a closed wallet sheet", () => {
    expect(submitFailureReason("card", { type: "validation_error", code: "incomplete_number" })).toBe("incomplete");
    expect(submitFailureReason("card", { type: "validation_error" })).toBe("incomplete");
    expect(submitFailureReason("apple_pay", { type: "validation_error", code: "incomplete_cvc" })).toBe("incomplete");
    expect(submitFailureReason("apple_pay", { type: "validation_error" })).toBe("wallet_closed");
    expect(submitFailureReason("google_pay", { type: "card_error", code: "payment_cancelled" })).toBe("wallet_closed");
    expect(submitFailureReason("klarna", { type: "api_error" })).toBe("other");
  });

  it("writes German history notes", () => {
    expect(paymentNoteText("incomplete", "card")).toBe("Zahlung nicht abgeschlossen: Kartenangaben unvollständig");
    expect(paymentNoteText("wallet_closed", "apple_pay")).toBe("Zahlung nicht abgeschlossen: Apple-Pay-Fenster geschlossen");
    expect(paymentNoteText("wallet_closed", "google_pay")).toBe("Zahlung nicht abgeschlossen: Google-Pay-Fenster geschlossen");
    expect(paymentNoteText("incomplete", "eps")).toBe("Zahlung nicht abgeschlossen: Angaben unvollständig (EPS)");
    expect(paymentNoteText("other", "card", "api_error · <script>\nx")).toBe("Zahlung nicht abgeschlossen: api_error · script x");
  });
});

describe("POST /api/orders/payment-note", () => {
  it("adds the note to an unpaid order with the right token", async () => {
    const r = await post({ orderId: "bq-note01", token: TOKEN, reason: "wallet_closed", method: "apple_pay" });
    expect(r.status).toBe(200);
    expect(state.order!.history.at(-1)?.note).toBe("Zahlung nicht abgeschlossen: Apple-Pay-Fenster geschlossen");
    expect(state.order!.payment.status).toBe("pending");
  });

  it("refuses wrong tokens, unknown reasons and paid orders", async () => {
    expect((await post({ orderId: "BQ-NOTE01", token: "x".repeat(24), reason: "incomplete" })).status).toBe(404);
    expect((await post({ orderId: "BQ-NOTE01", reason: "incomplete" })).status).toBe(404);
    expect((await post({ orderId: "BQ-NOTE01", token: TOKEN, reason: "hack" })).status).toBe(400);
    expect((await post({ orderId: "BQ-OTHER", token: TOKEN, reason: "incomplete" })).status).toBe(404);
    state.order!.payment.status = "paid";
    expect((await post({ orderId: "BQ-NOTE01", token: TOKEN, reason: "incomplete" })).status).toBe(409);
    expect(state.order!.history).toHaveLength(1);
  });

  it("caps the notes per order at ten", async () => {
    for (let i = 0; i < 13; i++) await post({ orderId: "BQ-NOTE01", token: TOKEN, reason: "incomplete", method: "card" });
    expect(state.order!.history.filter((h) => h.note)).toHaveLength(10);
  });

  it("is rate-limited per client", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 22; i++) statuses.push((await post({ orderId: "BQ-NOTE01", token: TOKEN, reason: "incomplete" }, "192.0.2.77")).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});

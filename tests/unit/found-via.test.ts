import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({ order: null as null | Record<string, unknown> }));
vi.mock("@/lib/cms", () => ({
  getOrderById: vi.fn(async (id: string) => (state.order && id === state.order.id ? structuredClone(state.order) : null)),
  updateOrder: vi.fn(async (_id: string, fn: (o: unknown) => unknown) => {
    state.order = fn(structuredClone(state.order)) as Record<string, unknown>;
    return state.order;
  }),
}));

import { POST } from "@/app/api/reviews/found-via/route";
import { FOUND_VIA_OPTIONS, foundViaLabel, readFoundVia } from "@/lib/found-via";
import { reviewRequest } from "@/lib/mail/templates";

const TOKEN = "0123456789abcdef01234567";
const brand = { name: "Blumora", siteUrl: "https://blumora.at" };
let ip = 0;
const post = (body: unknown) =>
  POST(new Request("http://localhost:3000/api/reviews/found-via", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `192.0.2.${++ip % 250}` },
    body: JSON.stringify(body),
  }));

const order = (extra: Partial<Order> = {}) =>
  ({ id: "BQ-FOUND1", token: TOKEN, status: "delivered", customer: { firstName: "Anna", lastName: "Muster", email: "anna@example.com", phone: "" }, lines: [{ productName: "Red Passion" }], ...extra }) as unknown as Order;

beforeEach(() => {
  state.order = order() as unknown as Record<string, unknown>;
});

describe("readFoundVia", () => {
  it("accepts known answers, keeps free text only for Sonstiges", () => {
    expect(readFoundVia("instagram", "egal", "2026-11-18T10:00:00.000Z")).toEqual({ source: "instagram", at: "2026-11-18T10:00:00.000Z" });
    expect(readFoundVia("sonstiges", " Flyer\\nim Café ", "x")).toMatchObject({ source: "sonstiges", other: "Flyer\\nim Café" });
    expect(readFoundVia("sonstiges", "Flyer\nim Café", "x")?.other).toBe("Flyer im Café");
    expect(readFoundVia("radio", "", "x")).toBeNull();
    expect(foundViaLabel({ source: "sonstiges", other: "Flyer" })).toBe("Sonstiges: Flyer");
  });
});

describe("review mail asks how the customer found us", () => {
  it("lists every answer as a link to the review page", () => {
    const mail = reviewRequest({ order: order(), brand, reviewUrl: "https://blumora.at/bewertung?order=BQ-FOUND1&token=abc" });
    expect(mail.html).toContain("Wie hast du uns gefunden?");
    for (const o of FOUND_VIA_OPTIONS) expect(mail.html).toContain(`quelle=${o.id}#gefunden`);
    expect(mail.text).toContain("- Instagram: https://blumora.at/bewertung?order=BQ-FOUND1&token=abc&quelle=instagram#gefunden");
  });

  it("does not ask again once answered", () => {
    const mail = reviewRequest({ order: order({ foundVia: { source: "google", at: "x" } }), brand, reviewUrl: "https://blumora.at/bewertung?order=BQ-FOUND1&token=abc" });
    expect(mail.html).not.toContain("Wie hast du uns gefunden?");
  });
});

describe("POST /api/reviews/found-via", () => {
  it("stores the answer on the order", async () => {
    const res = await post({ order: "bq-found1", token: TOKEN, source: "sonstiges", other: "Flyer" });
    expect(res.status).toBe(200);
    expect(state.order?.foundVia).toMatchObject({ source: "sonstiges", other: "Flyer" });
  });

  it("rejects a wrong token or an unknown answer", async () => {
    expect((await post({ order: "BQ-FOUND1", token: "x".repeat(24), source: "google" })).status).toBe(404);
    expect((await post({ order: "BQ-FOUND1", token: TOKEN, source: "radio" })).status).toBe(422);
    expect(state.order?.foundVia).toBeUndefined();
  });
});

import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/cms", () => ({ readData: vi.fn(), writeData: vi.fn() }));
vi.mock("@/lib/courier", () => ({ bookCourierSafely: vi.fn() }));
vi.mock("@/lib/mail", () => ({ sendOrderConfirmation: vi.fn() }));

import { parseOrderPayload, resolveLines } from "@/lib/orders";
import { cartItemFromConfig } from "@/lib/cart-helpers";
import { floristOrder, orderConfirmation } from "@/lib/mail/templates";
import type { Order, Product } from "@/types";
import { makeProduct } from "./fixtures";

const tulips = makeProduct({
  id: "p-tulpen", slug: "tulpen", name: "Tulpenstrauß",
  sizes: [{ id: "m", label: "Standard", price: 39.9 }],
  colorOptions: [{ id: "rot", label: "Rot", image: "/t-rot.jpg" }, { id: "weiss", label: "Weiß" }],
});
const item = (extra: Record<string, unknown> = {}) => ({ productId: "p-tulpen", sizeId: "m" as const, quantity: 1, extras: [], ...extra });

describe("colour choice", () => {
  it("is required when a product offers colours, and must be one of them", () => {
    expect(resolveLines([item()], [tulips], [])).toEqual({ ok: false, message: "Bitte wähle eine Farbe für „Tulpenstrauß\"." });
    expect(resolveLines([item({ colorId: "lila" })], [tulips], []).ok).toBe(false);
    const ok = resolveLines([item({ colorId: "rot" })], [tulips], []);
    expect(ok.ok && ok.lines[0].line).toMatchObject({ color: "Rot", image: "/t-rot.jpg" });
  });

  it("is not asked for products without colours", () => {
    const plain = makeProduct({ id: "p-plain", sizes: [{ id: "m", label: "Standard", price: 10 }] }) as Product;
    const res = resolveLines([{ productId: "p-plain", sizeId: "m", quantity: 1, extras: [] }], [plain], []);
    expect(res.ok && res.lines[0].line.color).toBeUndefined();
  });

  it("the cart item carries the colour and its photo", () => {
    const c = cartItemFromConfig({ product: tulips, size: tulips.sizes[0], color: tulips.colorOptions![0], floristNote: "  bitte ohne Grün  " });
    expect(c).toMatchObject({ colorId: "rot", floristNote: "bitte ohne Grün", snapshot: { colorLabel: "Rot", image: "/t-rot.jpg" } });
  });
});

describe("wish to the florist", () => {
  it("is kept (max. 300 characters) and travels to the order line", () => {
    const parsed = parseOrderPayload({ items: [item({ colorId: "rot", floristNote: "statt gelber bitte weiße Rosen\r\n" + "x".repeat(400) })] }, { greetingMaxChars: 200 });
    // The payload fails later on missing addresses – the item itself must be fine.
    expect(parsed.ok ? "" : parsed.message).not.toBe("Ungültiger Artikel im Warenkorb.");
    const res = resolveLines([item({ colorId: "rot", floristNote: "statt gelber bitte weiße Rosen" })], [tulips], []);
    expect(res.ok && res.lines[0].line.floristNote).toBe("statt gelber bitte weiße Rosen");
  });

  it("shows colour and wish to the florist and in the customer's confirmation", () => {
    const order = {
      id: "BQ-T1", token: "t", createdAt: "2026-11-17T10:00:00.000Z", status: "paid", history: [],
      recipient: { firstName: "A", lastName: "B", street: "S", houseNumber: "1", zip: "1010", city: "Wien", country: "AT", phone: "1" },
      delivery: { date: "2026-11-18", windowId: "am", windowLabel: "9–12 Uhr", windowFrom: "09:00", windowTo: "12:00", zoneId: "z", zoneName: "Wien", fee: 0 },
      customer: { firstName: "C", lastName: "D", email: "c@example.at", phone: "1" },
      lines: [{ productId: "p-tulpen", productName: "Tulpenstrauß", sizeId: "m", sizeLabel: "Standard", quantity: 1, unitPrice: 39.9, image: "", extras: [], color: "Rot", floristNote: "bitte ohne Grün" }],
      totals: { subtotal: 39.9, extras: 0, delivery: 0, discount: 0, total: 39.9 },
      payment: { method: "card", status: "paid" },
    } as unknown as Order;
    const brand = { name: "Blumora", siteUrl: "https://blumora.at" };
    const slip = floristOrder({ order, brand });
    expect(slip.text).toContain("Farbe Rot");
    expect(slip.text).toContain("Wunsch der Kund:in: bitte ohne Grün");
    expect(slip.html).toContain("Wunsch der Kund:in");
    const conf = orderConfirmation({ order, brand, trackingUrl: "https://blumora.at/x" });
    expect(conf.text).toContain("Farbe Rot");
    expect(conf.text).toContain("Dein Wunsch an die Floristik: bitte ohne Grün");
  });
});

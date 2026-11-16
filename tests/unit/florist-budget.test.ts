import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/cms", () => ({ readData: vi.fn(), writeData: vi.fn() }));
import { attachFloristBudgets, parseFloristBudgets } from "@/lib/florist-budget";
import { publicOrderView } from "@/lib/orders";
import type { Extra, Order, Product } from "@/types";

vi.mock("@/lib/courier", () => ({ bookCourierSafely: vi.fn() }));
vi.mock("@/lib/mail", () => ({ sendOrderConfirmation: vi.fn() }));

const products = [{ id: "p-red-rose-bouquet", sizes: [{ id: "s" }, { id: "m" }] }] as unknown as Product[];
const extras = [{ id: "x-teddy" }] as unknown as Extra[];

describe("florist budgets", () => {
  it("keeps known products, sizes and extras and reports the rest", () => {
    const res = parseFloristBudgets({
      products: { "p-red-rose-bouquet": { s: 25.5, m: "41,5", xl: 90 }, "p-gibts-nicht": { s: 1 } },
      extras: { "x-teddy": 12.5, "x-vase": 5 },
    }, products, extras);
    expect(res).toEqual({
      ok: true,
      budgets: { products: { "p-red-rose-bouquet": { s: 25.5, m: 41.5 } }, extras: { "x-teddy": 12.5 } },
      skipped: ["p-red-rose-bouquet/xl", "p-gibts-nicht", "x-vase"],
    });
  });

  it("refuses nonsense amounts and formats", () => {
    const res = parseFloristBudgets({ products: { "p-red-rose-bouquet": { s: -1, m: "abc" } }, extras: { "x-teddy": 99999 } }, products, extras);
    expect(res.ok && res.budgets).toEqual({ products: {}, extras: {} });
    expect(parseFloristBudgets("x", products, extras).ok).toBe(false);
    expect(parseFloristBudgets({ products: 3 }, products, extras).ok).toBe(false);
  });

  it("snapshots budgets onto order lines and never shows them to customers", () => {
    const lines = attachFloristBudgets([{
      productId: "p-red-rose-bouquet", productName: "Red Rose Bouquet", sizeId: "m", sizeLabel: "Mittel", quantity: 1, unitPrice: 65.9, image: "",
      extras: [{ extraId: "x-teddy", name: "Teddy", quantity: 1, unitPrice: 19.9 }],
    }], { products: { "p-red-rose-bouquet": { m: 41.5 } }, extras: { "x-teddy": 12.5 } });
    expect(lines[0].floristBudget).toBe(41.5);
    expect(lines[0].extras[0].floristBudget).toBe(12.5);

    const order = { id: "BQ-1", token: "t", internalNote: "intern", lines } as unknown as Order;
    const view = JSON.stringify(publicOrderView(order));
    expect(view).not.toContain("floristBudget");
    expect(view).not.toContain("41.5");
    expect(view).not.toContain("intern");
  });
});

describe("encrypted starting budgets", () => {
  it("decrypts only with the right key", async () => {
    const { createCipheriv, randomBytes } = await import("node:crypto");
    const { decryptBudgetBlob } = await import("@/lib/florist-budget-default");
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const c = createCipheriv("aes-256-gcm", key, iv);
    const data = Buffer.concat([c.update(JSON.stringify({ products: { p: { m: 1 } }, extras: {} })), c.final()]);
    const blob = [iv, c.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
    expect(decryptBudgetBlob(blob, key.toString("base64"))).toEqual({ products: { p: { m: 1 } }, extras: {} });
    expect(decryptBudgetBlob(blob, randomBytes(32).toString("base64"))).toBeNull();
    expect(decryptBudgetBlob(blob, undefined)).toBeNull();
    expect(decryptBudgetBlob("kaputt", key.toString("base64"))).toBeNull();
  });
});

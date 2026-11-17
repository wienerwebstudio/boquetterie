import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/cms", () => ({ readData: vi.fn(), writeData: vi.fn() }));
vi.mock("@/lib/courier", () => ({ bookCourierSafely: vi.fn() }));
vi.mock("@/lib/mail", () => ({ sendOrderConfirmation: vi.fn() }));

import fs from "node:fs";
import path from "node:path";
import { CONTENT_MIGRATIONS, ROSE_BOUQUET_IDS, migrateDocument } from "@/lib/content-migrations";
import { mergeBudgets } from "@/lib/florist-budget";
import { parseOrderPayload } from "@/lib/orders";
import type { Product } from "@/types";

const migrate = (doc: unknown) => migrateDocument(CONTENT_MIGRATIONS.find((m) => m.id === "2026-11-17-rose-sizes-xxl-xxxl")!, "products", doc);

describe("rose bouquets XXL / XXXL", () => {
  it("adds XXL (61) and XXXL (99) to rose bouquets only and keeps edited prices", () => {
    const before = [
      { id: "p-red-passion", sizes: [{ id: "s", label: "Klein", price: 49.9 }, { id: "xl", label: "XL", price: 127.9 }] },
      { id: "p-love-deluxe", sizes: [{ id: "s", label: "Klein", price: 36.9 }] },
    ];
    const after = migrate(before) as { id: string; sizes: { id: string; price: number; stems?: number }[] }[];
    expect(after[0].sizes.map((s) => [s.id, s.price, s.stems])).toEqual([
      ["s", 49.9, 9], ["xl", 127.9, 41], ["m", 65.9, 15], ["l", 93.9, 25], ["xxl", 175.9, 61], ["xxxl", 250.9, 99],
    ]);
    expect(after[1]).toBe(before[1]);
    expect(migrate(after)).toBe(after);
  });

  it("the repository ships all 12 rose bouquets with six sizes", () => {
    const products = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/products.json"), "utf8")) as Product[];
    for (const id of ROSE_BOUQUET_IDS) {
      const p = products.find((x) => x.id === id);
      expect(p?.sizes.map((s) => `${s.id}:${s.stems}:${s.price}`), id).toEqual(["s:9:48.9", "m:15:65.9", "l:25:93.9", "xl:41:127.9", "xxl:61:175.9", "xxxl:99:250.9"]);
    }
    expect(products.filter((p) => p.sizes.some((s) => s.id === "xxxl")).length).toBe(12);
  });

  it("every size photo in the repository exists, and Red Rose Bouquet has one per size", () => {
    const products = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/products.json"), "utf8")) as Product[];
    for (const p of products) for (const s of p.sizes) {
      if (s.image) expect(fs.existsSync(path.join(process.cwd(), "public", s.image)), `${p.id}/${s.id}: ${s.image}`).toBe(true);
    }
    const rrb = products.find((p) => p.id === "p-red-rose-bouquet")!;
    expect(rrb.sizes.every((s) => Boolean(s.image))).toBe(true);
    const keepAdminPhoto = migrateDocument(CONTENT_MIGRATIONS.find((m) => m.id === "2026-11-17-red-rose-size-photos")!, "products",
      [{ id: "p-red-rose-bouquet", sizes: [{ id: "s", image: "/x.jpg" }, { id: "m" }] }]) as Product[];
    expect(keepAdminPhoto[0].sizes.map((s) => s.image)).toEqual(["/x.jpg", "/images/products/sortiment/red-rose-bouquet-size-m.jpg"]);
  });

  it("every rose size photo has a close-up next to it; admin uploads are left alone", () => {
    const products = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/products.json"), "utf8")) as Product[];
    for (const p of products.filter((x) => ROSE_BOUQUET_IDS.includes(x.id))) for (const s of p.sizes) {
      expect(s.detailImage, `${p.id}/${s.id}`).toBe(s.image!.replace(/\.jpg$/, "-nah.jpg"));
      expect(fs.existsSync(path.join(process.cwd(), "public", s.detailImage!)), s.detailImage).toBe(true);
    }
    const out = migrateDocument(CONTENT_MIGRATIONS.find((m) => m.id === "2026-11-17-rose-size-closeups")!, "products", [
      { id: "p-red-passion", sizes: [{ id: "s", image: "/images/products/sortiment/red-passion-size-s.jpg" }, { id: "m", image: "/uploads/eigenes.jpg" }, { id: "l" }] },
      { id: "p-love-deluxe", sizes: [{ id: "s", image: "/images/products/sortiment/love-deluxe-1.jpg" }] },
    ]) as Product[];
    expect(out[0].sizes.map((s) => s.detailImage)).toEqual(["/images/products/sortiment/red-passion-size-s-nah.jpg", undefined, undefined]);
    expect(out[1].sizes[0].detailImage).toBeUndefined();
  });

  it("accepts XXXL in an order", () => {
    const item = { productId: "p-red-passion", sizeId: "xxxl", quantity: 1, extras: [] };
    const res = parseOrderPayload({ items: [item] }, { greetingMaxChars: 200 });
    // Fails later on missing customer data – but never on the size.
    expect(res.ok ? "" : res.message).not.toBe("Ungültiger Artikel im Warenkorb.");
  });
});

describe("florist budgets: saved values win, new sizes come from the defaults", () => {
  it("fills sizes the saved document does not know yet", () => {
    const merged = mergeBudgets(
      { updatedAt: "2026-11-16T10:00:00Z", products: { "p-red-passion": { s: 40 } }, extras: { "x-teddy": 21 } },
      { products: { "p-red-passion": { s: 38, xxl: 170.41 }, "p-rosalie": { m: 56 } }, extras: { "x-teddy": 20, "x-candle": 5 } },
    );
    expect(merged).toEqual({
      updatedAt: "2026-11-16T10:00:00Z",
      products: { "p-red-passion": { s: 40, xxl: 170.41 }, "p-rosalie": { m: 56 } },
      extras: { "x-teddy": 21, "x-candle": 5 },
    });
    expect(mergeBudgets(null, null)).toEqual({ products: {}, extras: {} });
  });
});

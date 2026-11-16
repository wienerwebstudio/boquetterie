import "server-only";
import { readData, writeData } from "@/lib/cms";
import type { Extra, OrderLine, Product } from "@/types";

/**
 * What the partner florist may spend per product size and per extra (purchase price, net).
 *
 * Kept as the runtime document `florist-budgets` – in the database, never in the
 * repository (which may be public) and never in anything a customer can see.
 * Edited and imported in the admin under "Floristen-Budget".
 */
export interface FloristBudgets {
  updatedAt?: string;
  /** productId → sizeId → EUR (net) */
  products: Record<string, Record<string, number>>;
  /** extraId → EUR (net) */
  extras: Record<string, number>;
}

export const EMPTY_BUDGETS: FloristBudgets = { products: {}, extras: {} };
const DOC = "florist-budgets";
/** Upper bound against typos (a wreath costs 128 € net; nothing is near 10 000 €). */
const MAX_BUDGET = 10_000;

export async function getFloristBudgets(): Promise<FloristBudgets> {
  const doc = await readData<FloristBudgets | null>(DOC, null);
  return doc ? { updatedAt: doc.updatedAt, products: doc.products ?? {}, extras: doc.extras ?? {} } : EMPTY_BUDGETS;
}

export async function saveFloristBudgets(budgets: FloristBudgets) {
  await writeData(DOC, { ...budgets, updatedAt: new Date().toISOString() });
}

const money = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(",", ".").trim()) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 && n <= MAX_BUDGET ? Math.round(n * 100) / 100 : null;
};

/**
 * Validates an imported or submitted budget document against the catalogue.
 * Unknown products, sizes and extras are reported, not stored; empty values are skipped.
 */
export function parseFloristBudgets(input: unknown, products: Product[], extras: Extra[]): { ok: true; budgets: FloristBudgets; skipped: string[] } | { ok: false; message: string } {
  if (!input || typeof input !== "object") return { ok: false, message: "Die Datei enthält keine Budget-Daten." };
  const raw = input as { products?: unknown; extras?: unknown };
  if ((raw.products !== undefined && (typeof raw.products !== "object" || raw.products === null)) || (raw.extras !== undefined && (typeof raw.extras !== "object" || raw.extras === null))) {
    return { ok: false, message: "Unerwartetes Format: erwartet werden „products“ und „extras“." };
  }
  const budgets: FloristBudgets = { products: {}, extras: {} };
  const skipped: string[] = [];
  for (const [productId, sizes] of Object.entries((raw.products ?? {}) as Record<string, unknown>)) {
    const product = products.find((p) => p.id === productId);
    if (!product || !sizes || typeof sizes !== "object") { skipped.push(productId); continue; }
    for (const [sizeId, value] of Object.entries(sizes as Record<string, unknown>)) {
      if (value === "" || value === null || value === undefined) continue;
      const amount = money(value);
      if (!product.sizes.some((s) => s.id === sizeId) || amount === null) { skipped.push(`${productId}/${sizeId}`); continue; }
      (budgets.products[productId] ??= {})[sizeId] = amount;
    }
  }
  for (const [extraId, value] of Object.entries((raw.extras ?? {}) as Record<string, unknown>)) {
    if (value === "" || value === null || value === undefined) continue;
    const amount = money(value);
    if (!extras.some((e) => e.id === extraId) || amount === null) { skipped.push(extraId); continue; }
    budgets.extras[extraId] = amount;
  }
  return { ok: true, budgets, skipped };
}

/** Copies the current budgets onto order lines (a snapshot – later changes do not alter old orders). */
export function attachFloristBudgets(lines: OrderLine[], budgets: FloristBudgets): OrderLine[] {
  return lines.map((l) => ({
    ...l,
    floristBudget: budgets.products[l.productId]?.[l.sizeId],
    extras: l.extras.map((e) => ({ ...e, floristBudget: budgets.extras[e.extraId] })),
  }));
}

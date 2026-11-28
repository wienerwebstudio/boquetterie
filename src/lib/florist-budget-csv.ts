import type { Extra, Product } from "@/types";
import type { FloristBudgets } from "@/lib/florist-budget";

const num = (v: number | null | undefined) => (typeof v === "number" ? v.toFixed(2).replace(".", ",") : "");
const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * Budget list for Excel (semicolon, decimal comma, UTF-8 BOM): one row per product size
 * and active extra, with sale price and max. budget.
 */
export function floristBudgetCsv(products: Product[], extras: Extra[], budgets: FloristBudgets): string {
  const rows: string[][] = [["Produkt", "Größe", "Aktiv", "Verkaufspreis (EUR)", "Max. Budget Floristik (EUR)"]];
  const sorted = products.slice().sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "de"));
  for (const p of sorted) {
    for (const s of p.sizes) {
      const b = budgets.products[p.id]?.[s.id];
      rows.push([p.name, s.label, p.active ? "ja" : "nein", num(s.price), num(b)]);
    }
  }
  for (const e of extras.filter((x) => x.active)) {
    const b = budgets.extras[e.id];
    rows.push(["Extra", e.name, "ja", num(e.price), num(b)]);
  }
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

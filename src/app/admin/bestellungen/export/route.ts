import { NextResponse } from "next/server";
import { getOrders, getSettings } from "@/lib/cms";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { filterOrders, orderLinesCsv, ordersCsv, ordersJson } from "@/lib/orders-export";

export const dynamic = "force-dynamic";

/**
 * GET /admin/bestellungen/export?format=orders|lines|json&status=…&q=…
 * Orders with all data (same filter as the list) as CSV for Excel (de-AT) or JSON. Admin only.
 */
export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 });
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "orders";
  const [orders, settings] = await Promise.all([getOrders(), getSettings()]);
  const list = filterOrders(orders, { status: url.searchParams.get("status") ?? "", q: url.searchParams.get("q") ?? "" }, settings);
  const date = new Date().toISOString().slice(0, 10);
  const headers = (type: string, name: string) => ({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="blumora-${name}-${date}.${type.startsWith("application/json") ? "json" : "csv"}"`,
    "Cache-Control": "no-store",
  });
  if (format === "json") return new NextResponse(ordersJson(list), { headers: headers("application/json; charset=utf-8", "bestellungen") });
  if (format === "lines") return new NextResponse(orderLinesCsv(list, settings), { headers: headers("text/csv; charset=utf-8", "positionen") });
  return new NextResponse(ordersCsv(list, settings), { headers: headers("text/csv; charset=utf-8", "bestellungen") });
}

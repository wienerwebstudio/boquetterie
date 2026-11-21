import { NextResponse } from "next/server";
import { getAllProducts, getExtras } from "@/lib/cms";
import { getFloristBudgets } from "@/lib/florist-budget";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { floristBudgetCsv } from "@/lib/florist-budget-csv";

export const dynamic = "force-dynamic";

/** GET /admin/floristen-budget/export – budgets per product size as CSV (Excel, de-AT). Admin only. */
export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 });
  const [products, extras, budgets] = await Promise.all([getAllProducts(true), getExtras(), getFloristBudgets()]);
  const csv = floristBudgetCsv(products, extras, budgets);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="blumora-floristen-budget-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

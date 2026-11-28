import { NextResponse } from "next/server";
import { getOrders, getPartnerLedgerEntries, getPartnerPortalSettings, getPartners } from "@/lib/cms";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { EMPTY_BUDGETS, getFloristBudgets } from "@/lib/florist-budget";
import { buildPartnerLedger, partnerCsv, type PartnerExportScope } from "@/lib/partner-ledger";

export const dynamic = "force-dynamic";

/**
 * GET /admin/partner-abrechnung/export – owed partner orders as Excel (de-AT) CSV. Admin only.
 * `partner` = a partner id or "all"; `month=YYYY-MM` (delivery month, empty = all months);
 * `scope=open` = only orders not yet paid (FIFO).
 */
export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 });
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const partnerParam = url.searchParams.get("partner") ?? "";
  if (month && !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ ok: false, message: "month ungültig" }, { status: 400 });
  const scope: PartnerExportScope = { ...(month ? { month } : {}), open: url.searchParams.getAll("scope").includes("open") };

  const partners = await getPartners();
  const chosen = partnerParam === "all" ? partners : partners.filter((p) => p.id === partnerParam);
  if (!chosen.length) return NextResponse.json({ ok: false, message: "partner fehlt" }, { status: 400 });

  const [orders, budgets, entries, settings] = await Promise.all([getOrders(), getFloristBudgets().catch(() => EMPTY_BUDGETS), getPartnerLedgerEntries(), getPartnerPortalSettings()]);
  const list = chosen.map((p) => ({ partnerName: p.name, ledger: buildPartnerLedger({ orders, partnerId: p.id, budgets, entries, settings: settings[p.id] }) }));
  const what = `${month || "gesamt"}${scope.open ? "-offen" : ""}`;
  const who = partnerParam === "all" ? "alle" : chosen[0].id;
  return new NextResponse(partnerCsv(list, scope), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="blumora-partner-${who}-${what}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { getPartners } from "@/lib/cms";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { loadPartnerLedger } from "@/lib/partner-portal";
import { partnerMonthCsv } from "@/lib/partner-ledger";

export const dynamic = "force-dynamic";

/** GET /admin/partner-abrechnung/export?partner=…&month=YYYY-MM – owed orders of one month (Excel de-AT). Admin only. */
export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 });
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const partner = (await getPartners()).find((p) => p.id === url.searchParams.get("partner"));
  if (!partner || !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ ok: false, message: "partner/month fehlt" }, { status: 400 });
  const ledger = await loadPartnerLedger(partner.id);
  return new NextResponse(partnerMonthCsv(ledger, month, partner.name), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="blumora-partner-${partner.id}-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

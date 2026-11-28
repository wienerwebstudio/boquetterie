import { NextResponse } from "next/server";
import { getOutreachContacts, getOutreachSends } from "@/lib/cms";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { outreachContactsCsv } from "@/lib/outreach/csv";
import { unsubscribedSet } from "@/lib/outreach/service";

export const dynamic = "force-dynamic";

/** GET /admin/outreach/export – outreach contacts with status as CSV (Excel, de-AT). Admin only. */
export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 });
  const [contacts, sends, blocked] = await Promise.all([getOutreachContacts(), getOutreachSends(), unsubscribedSet()]);
  const csv = outreachContactsCsv(contacts, sends, blocked);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="blumora-outreach-kontakte-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

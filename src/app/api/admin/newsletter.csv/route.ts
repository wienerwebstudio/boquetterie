import { getNewsletterSubscribers } from "@/lib/cms";

export const dynamic = "force-dynamic";

function csvCell(v: string) {
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** GET /api/admin/newsletter.csv – protected by the proxy (bl_admin cookie). */
export async function GET() {
  const subscribers = await getNewsletterSubscribers();
  const rows = [["email", "createdAt"], ...subscribers.map((s) => [s.email, s.createdAt])];
  const body = "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

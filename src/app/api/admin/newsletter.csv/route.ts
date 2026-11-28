import { getNewsletterSubscribers } from "@/lib/cms";

export const dynamic = "force-dynamic";

function csvCell(v: string) {
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * GET /api/admin/newsletter.csv – protected by the proxy (bl_admin cookie).
 * Only confirmed addresses (double opt-in): this is the list a newsletter may go to.
 */
export async function GET() {
  const subscribers = (await getNewsletterSubscribers()).filter((s) => s.status === "confirmed");
  const rows = [["email", "createdAt", "confirmedAt", "source"], ...subscribers.map((s) => [s.email, s.createdAt, s.confirmedAt ?? "", s.source ?? ""])];
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

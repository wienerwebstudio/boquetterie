import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Shared guard for `/api/cron/*` endpoints.
 *
 * Requests must carry `Authorization: Bearer ${CRON_SECRET}`. Vercel Cron sends
 * exactly this header when `CRON_SECRET` is set as an environment variable; a
 * classic crontab does it via `curl -H "Authorization: Bearer …"` (see docs/MAIL.md).
 * Returns a Response to send back when the request is NOT authorised, else null.
 */
export function authorizeCron(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  const ok = a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return null;
}

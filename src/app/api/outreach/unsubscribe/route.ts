import { NextResponse } from "next/server";
import { redirectLocal } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { outreachSecret, verifyUnsubscribeToken } from "@/lib/outreach/tokens";
import { unsubscribeOutreach } from "@/lib/outreach/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/outreach/unsubscribe?t=<token>
 *  - one-click (RFC 8058, header List-Unsubscribe-Post): body "List-Unsubscribe=One-Click" → 200
 *  - the button on /e-mail-abmelden (form field `t`) → back to the page with the outcome
 * GET only leads to the confirmation page – opening a link (mail scanners) changes nothing.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "outreach-unsubscribe", limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const url = new URL(req.url);
  const raw = await req.text().catch(() => "");
  const form = new URLSearchParams(raw.slice(0, 2000));
  const oneClick = form.get("List-Unsubscribe") === "One-Click";
  const token = (form.get("t") || url.searchParams.get("t") || "").slice(0, 600);
  const email = verifyUnsubscribeToken(token, outreachSecret());

  if (!email) {
    return oneClick
      ? NextResponse.json({ ok: false, error: "invalid token" }, { status: 400 })
      : redirectLocal("/e-mail-abmelden?status=invalid");
  }
  try {
    await unsubscribeOutreach(email, oneClick ? "one-click" : "link");
  } catch (err) {
    console.error("[outreach] unsubscribe failed", err);
    return oneClick ? NextResponse.json({ ok: false }, { status: 500 }) : redirectLocal("/e-mail-abmelden?status=error");
  }
  return oneClick ? NextResponse.json({ ok: true }) : redirectLocal("/e-mail-abmelden?status=removed");
}

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { scope: "outreach-unsubscribe-get", limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const t = new URL(req.url).searchParams.get("t") ?? "";
  return redirectLocal(`/e-mail-abmelden${t ? `?t=${encodeURIComponent(t.slice(0, 600))}` : ""}`);
}

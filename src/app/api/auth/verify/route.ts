import { NextResponse, type NextRequest } from "next/server";
import { createSessionValue, getAuthSecret, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { consumeLoginToken } from "@/lib/auth/tokens";
import { upsertCustomerOnLogin } from "@/lib/auth/customers";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify – form field `token`.
 *
 * Burns the magic-link token, creates/updates the customer, sets the session
 * cookie and sends the person to /konto. Deliberately POST-only: e-mail security
 * scanners follow GET links and would otherwise consume the single-use token
 * before the customer ever clicks it.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");

  const fail = (status: "invalid" | "expired" | "disabled") => {
    const url = new URL("/auth/verify", req.url);
    url.searchParams.set("status", status);
    return NextResponse.redirect(url, { status: 303 });
  };

  const secret = getAuthSecret();
  if (!secret) return fail("disabled");

  const result = await consumeLoginToken(token);
  if (result.status !== "valid") return fail(result.status);

  const customer = await upsertCustomerOnLogin(result.email);
  const res = NextResponse.redirect(new URL(`${routes.account}?willkommen=1`, req.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, createSessionValue(secret, customer.id), sessionCookieOptions());
  return res;
}

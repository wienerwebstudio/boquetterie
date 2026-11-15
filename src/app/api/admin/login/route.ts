import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE, createSessionToken, getAdminPassword, getAdminSecret, safeAdminRedirect, sessionCookieOptions, timingSafeEqual,
} from "@/lib/admin-auth";
import { clientKey, rateLimit, resetRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Five attempts per IP in ten minutes; a successful login clears the counter. */
const LOGIN_LIMIT = { scope: "admin-login", limit: 5, windowMs: 10 * 60 * 1000 };

/**
 * POST /api/admin/login – form fields: password, next.
 * Compares against ADMIN_PASSWORD and sets the signed session cookie.
 * Every attempt counts against LOGIN_LIMIT before the password is looked at;
 * once the limit is reached even the right password is refused until the window has passed.
 */
export async function POST(req: NextRequest) {
  const ip = clientKey(req);
  const limit = rateLimit(ip, LOGIN_LIMIT);
  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    // Plain text: this is the target of a browser form post, not of a fetch().
    return new NextResponse(`Zu viele Anmeldeversuche. Bitte in ${minutes} ${minutes === 1 ? "Minute" : "Minuten"} noch einmal versuchen.`, {
      status: 429,
      headers: { "content-type": "text/plain; charset=utf-8", "retry-after": String(limit.retryAfterSeconds), "cache-control": "no-store" },
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    form = new FormData();
  }
  const password = String(form.get("password") ?? "");
  const next = safeAdminRedirect(String(form.get("next") ?? ""));
  // Null when ADMIN_PASSWORD is missing or, in production, a default/too short value – the admin stays locked.
  const expected = getAdminPassword();
  const secret = getAdminSecret();

  const fail = (error: string) => {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("error", error);
    if (next !== "/admin") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  };

  if (!expected || !secret) return fail("config");
  // One answer for every wrong input (empty, wrong length, wrong value).
  if (!timingSafeEqual(password, expected)) return fail("invalid");

  resetRateLimit(ip, LOGIN_LIMIT.scope);
  const token = await createSessionToken(secret);
  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions());
  return res;
}

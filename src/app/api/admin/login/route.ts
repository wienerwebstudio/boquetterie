import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE, createSessionToken, getAdminPassword, getAdminSecret, safeAdminRedirect, sessionCookieOptions, timingSafeEqual,
} from "@/lib/admin-auth";
import { redirectLocal } from "@/lib/http";
import { clientKey, rateLimit, resetRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Five attempts per IP in ten minutes; a successful login clears the counter. */
const LOGIN_LIMIT = { scope: "admin-login", limit: 5, windowMs: 10 * 60 * 1000 };

/**
 * POST /api/admin/login – form fields: password, next.
 * Compares against ADMIN_PASSWORD and sets the signed session cookie.
 * Every attempt counts against LOGIN_LIMIT before the password is looked at;
 * once the limit is reached even the right password is refused until the window has passed.
 * Every outcome goes back to the login page with a reason the page explains
 * (`error=invalid|locked|config`, plus the attempts left or the minutes to wait).
 */
export async function POST(req: NextRequest) {
  const ip = clientKey(req);
  const limit = rateLimit(ip, LOGIN_LIMIT);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    form = new FormData();
  }
  const next = safeAdminRedirect(String(form.get("next") ?? ""));

  const fail = (error: "invalid" | "locked" | "config", extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ error, ...extra });
    if (next !== "/admin") params.set("next", next);
    const res = redirectLocal(`/admin/login?${params}`);
    if (error === "locked" && extra.minuten) res.headers.set("retry-after", String(Number(extra.minuten) * 60));
    return res;
  };

  if (!limit.ok) return fail("locked", { minuten: String(Math.ceil(limit.retryAfterSeconds / 60)) });

  // Surrounding whitespace is a copy-and-paste accident, never part of the password.
  const password = String(form.get("password") ?? "").trim();
  // Null when ADMIN_PASSWORD is missing or, in production, a default/too short value – the admin stays locked.
  const expected = getAdminPassword()?.trim() || null;
  const secret = getAdminSecret();

  if (!expected || !secret) return fail("config");
  // One answer for every wrong input (empty, wrong length, wrong value); only the attempts left differ.
  if (!timingSafeEqual(password, expected)) return fail("invalid", { versuche: String(limit.remaining) });

  resetRateLimit(ip, LOGIN_LIMIT.scope);
  const token = await createSessionToken(secret);
  const res = redirectLocal(next);
  res.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions());
  return res;
}

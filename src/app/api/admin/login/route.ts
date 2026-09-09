import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE, createSessionToken, getAdminSecret, safeAdminRedirect, sessionCookieOptions, timingSafeEqual,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/login – form fields: password, next.
 * Compares against ADMIN_PASSWORD and sets the signed session cookie.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = safeAdminRedirect(String(form.get("next") ?? ""));
  const expected = process.env.ADMIN_PASSWORD;
  const secret = getAdminSecret();

  const fail = (error: string) => {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("error", error);
    if (next !== "/admin") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  };

  if (!expected || !secret) return fail("config");
  if (!password || !timingSafeEqual(password, expected)) return fail("invalid");

  const token = await createSessionToken(secret);
  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions());
  return res;
}

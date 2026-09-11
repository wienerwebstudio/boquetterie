import { NextResponse, type NextRequest } from "next/server";
import { clearedSessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout – clears the customer session and returns to /konto. */
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL(`${routes.account}?abgemeldet=1`, req.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, "", clearedSessionCookieOptions());
  return res;
}

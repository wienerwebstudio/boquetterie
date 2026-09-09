import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, getAdminSecret, verifySessionToken } from "@/lib/admin-auth";

/**
 * Protects the admin area and admin API with the signed `bq_admin` cookie.
 * The login page and the login/logout endpoints stay reachable.
 */
const PUBLIC = new Set(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authed = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value, getAdminSecret());

  if (PUBLIC.has(pathname)) {
    if (pathname === "/admin/login" && authed) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname + search);
  const res = NextResponse.redirect(login);
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

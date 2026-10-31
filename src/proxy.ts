import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, getAdminSecret, verifySessionToken } from "@/lib/admin-auth";
import { isOpenPath, isUnlocked, siteLockPassword } from "@/lib/site-lock";

/**
 * 1. Optional site lock (SITE_PASSWORD): the whole site asks for a password before launch.
 * 2. Protects the admin area and admin API with the signed `bl_admin` cookie.
 *    The login page and the login/logout endpoints stay reachable.
 */
const PUBLIC = new Set(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const lock = siteLockPassword();
  if (lock && !isOpenPath(pathname) && !isUnlocked(request.headers.get("authorization"), lock)) {
    return new NextResponse("Diese Seite ist noch nicht öffentlich.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Bloomery", charset="UTF-8"',
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      },
    });
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

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
  // Everything except Next's static build output; the admin check above narrows itself.
  matcher: ["/((?!_next/static|_next/image).*)"],
};

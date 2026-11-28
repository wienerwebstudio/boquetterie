import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, getAdminSecret, verifySessionToken } from "@/lib/admin-auth";
import { isOpenPath, isUnlocked, siteLockPassword } from "@/lib/site-lock";
import { resolvePublicPath } from "@/i18n/paths";

/**
 * 1. Optional site lock (SITE_PASSWORD): the whole site asks for a password before launch.
 * 2. Protects the admin area and admin API with the signed `bl_admin` cookie.
 *    The login page and the login/logout endpoints stay reachable.
 * 3. Languages: public storefront URLs (`/blumen`, `/en/flowers`) are rewritten to the
 *    internal routes `/{locale}/{German path}` (app/[locale]); `/de/...` and German path
 *    names under another language redirect to the canonical URL (src/i18n/paths.ts).
 */
const PUBLIC = new Set(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const lock = siteLockPassword();
  if (lock && !isOpenPath(pathname) && !isUnlocked(request.headers.get("authorization"), lock)) {
    return new NextResponse("Diese Seite ist noch nicht öffentlich.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Blumora", charset="UTF-8"',
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      },
    });
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    const resolved = resolvePublicPath(pathname);
    if (!resolved) return NextResponse.next();
    if (resolved.redirect !== undefined) {
      const url = request.nextUrl.clone();
      url.pathname = resolved.redirect;
      return NextResponse.redirect(url, 308);
    }
    const url = request.nextUrl.clone();
    url.pathname = resolved.internal;
    return NextResponse.rewrite(url);
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

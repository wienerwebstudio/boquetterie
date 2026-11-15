import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/logout – clears the session cookie.
 * POST only: a GET handler could be triggered by any link or `<img src>` on another site.
 * (The admin shell submits a `<form method="post">`.)
 */
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

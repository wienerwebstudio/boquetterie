import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function logout(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

export async function POST(req: NextRequest) {
  return logout(req);
}
export async function GET(req: NextRequest) {
  return logout(req);
}

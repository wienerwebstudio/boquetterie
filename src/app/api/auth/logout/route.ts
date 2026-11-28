import { redirectLocal } from "@/lib/http";
import { clearedSessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout – clears the customer session and returns to /konto. */
export async function POST() {
  const res = redirectLocal(`${routes.account}?abgemeldet=1`);
  res.cookies.set(SESSION_COOKIE, "", clearedSessionCookieOptions());
  return res;
}

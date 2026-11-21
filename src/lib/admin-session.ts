import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, getAdminSecret, verifySessionToken } from "@/lib/admin-auth";

/** True when the current request carries a valid admin session cookie. */
export async function isAdminAuthenticated() {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value, getAdminSecret());
}

/**
 * Server Functions are reachable via direct POST – every admin action must call
 * this before touching data (the proxy alone is not enough).
 */
export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) throw new Error("Nicht angemeldet.");
}

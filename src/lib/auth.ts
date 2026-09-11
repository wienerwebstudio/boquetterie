import "server-only";
import { cookies } from "next/headers";
import { getAuthSecret, SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";
import { getCustomerById } from "@/lib/auth/customers";
import type { Customer } from "@/types/auth";

/**
 * Customer session – read side.
 *
 * `getCurrentCustomer()` verifies the `bq_session` cookie (HMAC, expiry) and
 * loads the customer row; `requireCustomer()` throws for Server Functions that
 * must never run anonymously (they are reachable via direct POST).
 */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const store = await cookies();
  const payload = verifySessionValue(store.get(SESSION_COOKIE)?.value, getAuthSecret());
  if (!payload) return null;
  return getCustomerById(payload.customerId);
}

export async function requireCustomer(): Promise<Customer> {
  const customer = await getCurrentCustomer();
  if (!customer) throw new Error("Nicht angemeldet.");
  return customer;
}

export { isAuthConfigured } from "@/lib/auth/session";

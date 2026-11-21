import "server-only";
import { randomBytes } from "node:crypto";
import { getOrdersByEmail, readData, writeData } from "@/lib/cms";
import { normalizeEmail } from "@/lib/auth/tokens";
import type { Customer } from "@/types/auth";

const FILE = "customers";

export async function getCustomers() {
  return readData<Customer[]>(FILE, []);
}

export async function getCustomerById(id: string) {
  return (await getCustomers()).find((c) => c.id === id) ?? null;
}

export async function getCustomerByEmail(email: string) {
  const needle = normalizeEmail(email);
  return (await getCustomers()).find((c) => c.email === needle) ?? null;
}

/**
 * Called after a successful magic-link verification. Creates the customer on the
 * first login (pre-filling the name/phone from the most recent order placed with
 * this e-mail, if any) and stamps `lastLoginAt` on every login.
 */
export async function upsertCustomerOnLogin(email: string, now = new Date()): Promise<Customer> {
  const normalized = normalizeEmail(email);
  const customers = await getCustomers();
  const at = now.toISOString();
  const idx = customers.findIndex((c) => c.email === normalized);
  if (idx >= 0) {
    customers[idx] = { ...customers[idx], lastLoginAt: at };
    await writeData(FILE, customers);
    return customers[idx];
  }
  const latest = (await getOrdersByEmail(normalized))
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const created: Customer = {
    id: `cus_${randomBytes(8).toString("hex")}`,
    email: normalized,
    createdAt: at,
    lastLoginAt: at,
    ...(latest ? { firstName: latest.customer.firstName, lastName: latest.customer.lastName, phone: latest.customer.phone } : {}),
  };
  customers.push(created);
  await writeData(FILE, customers);
  return created;
}

export type ProfilePatch = Pick<Customer, "firstName" | "lastName" | "phone">;

export async function updateCustomerProfile(id: string, patch: ProfilePatch): Promise<Customer | null> {
  const customers = await getCustomers();
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const next: Customer = { ...customers[idx] };
  (Object.keys(patch) as (keyof ProfilePatch)[]).forEach((key) => {
    const value = patch[key];
    if (value) next[key] = value;
    else delete next[key];
  });
  customers[idx] = next;
  await writeData(FILE, customers);
  return next;
}

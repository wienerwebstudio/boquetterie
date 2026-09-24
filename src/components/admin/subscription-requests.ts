import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Subscription requests are written by the storefront to `data/subscription-requests.json`
 * (the file may not exist yet). There is no accessor in `src/lib/cms.ts` for it, so this
 * read lives here for now – move it into cms.ts once the storefront side exists.
 */
export type SubscriptionRequest = Record<string, unknown> & { createdAt?: string };

export async function getSubscriptionRequests(): Promise<SubscriptionRequest[] | null> {
  const file = path.join(process.cwd(), "data", "subscription-requests.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SubscriptionRequest[]) : [];
  } catch {
    return null;
  }
}

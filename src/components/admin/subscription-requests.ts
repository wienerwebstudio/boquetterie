import "server-only";
import { readData } from "@/lib/cms";

/**
 * Subscription requests written by `POST /api/subscription-request`. Read through
 * the store (JSON file or Postgres), like every other runtime document.
 */
export type SubscriptionRequest = Record<string, unknown> & { createdAt?: string };

export async function getSubscriptionRequests(): Promise<SubscriptionRequest[] | null> {
  try {
    const list = await readData<unknown>("subscription-requests", []);
    return Array.isArray(list) ? (list as SubscriptionRequest[]) : [];
  } catch {
    return null;
  }
}

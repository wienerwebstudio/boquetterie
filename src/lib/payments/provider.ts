import "server-only";
import type { Order } from "@/types";
import type { CreatePaymentResult, PaymentProviderId } from "@/types/payments";

/**
 * Contract every payment adapter implements. Adapters never touch orders or the
 * file system – they only talk to their provider and return normalised results.
 * Applying those results to an order happens in `src/lib/orders.ts`.
 */

export interface PaymentContext {
  order: Order;
  /** Absolute origin without trailing slash, e.g. "https://bloomery.at". */
  siteUrl: string;
}

export interface VerifyResult {
  status: "paid" | "pending" | "failed" | "refunded" | "unknown";
  intentId?: string;
  reference?: string;
  message?: string;
}

/** A provider notification, normalised so the webhook routes stay provider-agnostic. */
export interface PaymentEvent {
  kind: "paid" | "failed" | "refunded";
  /** Our order id when the provider echoes it back (metadata / custom_id). */
  orderId?: string;
  /** Provider-side id to look the order up by when `orderId` is missing. */
  intentId?: string;
  reference?: string;
  note?: string;
}

export interface WebhookResult {
  /** Provider event type as received (for logging). */
  type: string;
  /** `null` when the event is not relevant for the shop. */
  event: PaymentEvent | null;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

export interface PaymentProviderAdapter {
  id: PaymentProviderId;
  /** True when the environment carries everything the adapter needs. */
  isConfigured(): boolean;
  createPayment(ctx: PaymentContext): Promise<CreatePaymentResult>;
  verifyPayment(order: Order): Promise<VerifyResult>;
  /** Parses and verifies a webhook request. Throws `WebhookVerificationError` on a bad signature. */
  processWebhook(req: Request): Promise<WebhookResult>;
}

export function toCents(amount: number) {
  return Math.round(amount * 100);
}

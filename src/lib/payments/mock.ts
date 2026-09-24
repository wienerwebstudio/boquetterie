import "server-only";
import { randomBytes } from "node:crypto";
import type { Order } from "@/types";
import type { CreatePaymentResult } from "@/types/payments";
import type { PaymentProviderAdapter, VerifyResult, WebhookResult } from "./provider";

/**
 * Mock provider – development fallback. NEVER charges anyone: every payment is
 * reported as `paid` immediately with a `mock_…` reference. The storefront labels
 * such orders as "Testmodus".
 */

export const MOCK_REFERENCE_PREFIX = "mock_";

export function isMockReference(reference?: string) {
  return Boolean(reference && reference.startsWith(MOCK_REFERENCE_PREFIX));
}

export const mockProvider: PaymentProviderAdapter = {
  id: "mock",
  isConfigured: () => true,

  async createPayment({ order }): Promise<CreatePaymentResult> {
    // Simulate a short round-trip so loading states are visible in development.
    await new Promise((r) => setTimeout(r, 250));
    return {
      status: "paid",
      provider: "mock",
      reference: `${MOCK_REFERENCE_PREFIX}${order.payment.method}_${randomBytes(6).toString("hex")}`,
      message: "Testzahlung – es wurde kein Betrag abgebucht.",
    };
  },

  async verifyPayment(order: Order): Promise<VerifyResult> {
    return isMockReference(order.payment.reference)
      ? { status: "paid", reference: order.payment.reference }
      : { status: "unknown" };
  },

  async processWebhook(): Promise<WebhookResult> {
    return { type: "mock.ignored", event: null };
  },
};

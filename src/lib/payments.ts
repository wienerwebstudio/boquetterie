import "server-only";
import { randomBytes } from "node:crypto";
import type { PaymentMethodConfig } from "@/types";

/**
 * Payment provider abstraction.
 *
 * The shop never talks to a payment provider directly – every charge goes through
 * `processPayment`, which dispatches to the provider configured for the method in
 * `content/settings.json` (`payments[].provider`).
 *
 * Only the `mock` provider is implemented. It NEVER charges anyone; it simply
 * returns `paid` with a `mock_…` reference so the order flow can be exercised
 * end-to-end in development. The confirmation page labels such orders as
 * "Testmodus".
 *
 * TODO(payments): real providers. Each one is a small adapter that returns a
 * `PaymentResult`:
 *   - stripe  → create a PaymentIntent (card / Apple Pay / Google Pay / EPS), confirm
 *               it client-side with Stripe.js and verify the intent status server-side
 *               (or via webhook) before marking the order `paid`.
 *   - paypal  → create + capture an order via the PayPal Orders API, verify the capture.
 *   - klarna  → create a Klarna Payments session, authorize client-side, create the order
 *               with the authorization token.
 * Until an adapter exists, unknown providers return `pending` – the order is stored
 * but stays in status `received` and must be settled manually.
 */

export type PaymentProvider = NonNullable<PaymentMethodConfig["provider"]>;
export type PaymentStatus = "paid" | "pending" | "failed";

export interface PaymentRequest {
  method: PaymentMethodConfig["id"];
  /** Gross amount in EUR. */
  amount: number;
  orderId: string;
  /** Resolved from settings by the caller; defaults to `mock`. */
  provider?: PaymentProvider;
}

export interface PaymentResult {
  status: PaymentStatus;
  provider: PaymentProvider;
  reference?: string;
  /** Human readable, safe to show to the customer. */
  message?: string;
}

export const MOCK_REFERENCE_PREFIX = "mock_";

/** True if the reference was produced by the mock provider (i.e. no real charge happened). */
export function isMockPayment(reference?: string) {
  return Boolean(reference && reference.startsWith(MOCK_REFERENCE_PREFIX));
}

async function mockProvider(req: PaymentRequest): Promise<PaymentResult> {
  // Simulate a short round-trip so loading states are visible in development.
  await new Promise((r) => setTimeout(r, 250));
  return {
    status: "paid",
    provider: "mock",
    reference: `${MOCK_REFERENCE_PREFIX}${req.method}_${randomBytes(6).toString("hex")}`,
    message: "Testzahlung – es wurde kein Betrag abgebucht.",
  };
}

async function notImplemented(req: PaymentRequest, provider: PaymentProvider): Promise<PaymentResult> {
  // TODO(payments): replace with the real adapter (see file header).
  console.warn(`[payments] provider "${provider}" is not implemented – order ${req.orderId} stays pending.`);
  return {
    status: "pending",
    provider,
    message: "Die Zahlung wird noch bestätigt.",
  };
}

export async function processPayment(req: PaymentRequest): Promise<PaymentResult> {
  const provider = req.provider ?? "mock";
  if (!(req.amount >= 0) || !Number.isFinite(req.amount)) {
    return { status: "failed", provider, message: "Ungültiger Betrag." };
  }
  switch (provider) {
    case "mock":
      return mockProvider(req);
    case "stripe":
    case "paypal":
    case "klarna":
      return notImplemented(req, provider);
    default:
      return { status: "failed", provider, message: "Unbekannter Zahlungsanbieter." };
  }
}

/**
 * Payment types that are safe to share between server and client.
 * Server-only details (provider adapters, secrets) live in `src/lib/payments*`.
 */
import type { PaymentMethodConfig } from "@/types";

export type PaymentProviderId = "mock" | "stripe" | "paypal";
export type PaymentMethodId = PaymentMethodConfig["id"];

/** A payment method as exposed to the storefront (`GET /api/payments/methods`). */
export interface PublicPaymentMethod {
  id: PaymentMethodId;
  label: string;
  /** Provider that will actually handle this method (already resolved against the environment). */
  provider: PaymentProviderId;
}

export interface PaymentMethodsResponse {
  ok: true;
  methods: PublicPaymentMethod[];
  /** Present when Stripe is configured – needed by Stripe.js in the browser. */
  stripePublishableKey?: string;
  /** True when the Blumen-Abo can be paid via Stripe Checkout. */
  subscriptionCheckout: boolean;
}

/** Result of creating a payment at the provider for a freshly stored order. */
export interface CreatePaymentResult {
  status: "paid" | "pending" | "failed";
  provider: PaymentProviderId;
  /** Provider-side id (Stripe PaymentIntent id, PayPal order id …). */
  intentId?: string;
  /** Stripe only – handed to the Payment Element in the browser. Never persisted. */
  clientSecret?: string;
  /** PayPal only – the customer is redirected here to approve the payment. */
  approveUrl?: string;
  /** Settlement reference (mock reference, Stripe charge id, PayPal capture id …). */
  reference?: string;
  /** Human readable, safe to show to the customer. */
  message?: string;
}

/** What the client receives from `POST /api/orders`. */
export interface OrderCreateResponse {
  ok: true;
  id: string;
  token: string;
  status: string;
  payment: {
    provider: PaymentProviderId;
    status: CreatePaymentResult["status"];
    clientSecret?: string;
    approveUrl?: string;
  };
}

/** What the client receives from the confirm endpoints. */
export interface PaymentConfirmResponse {
  ok: boolean;
  status: "paid" | "pending" | "failed" | "refunded";
  message?: string;
}

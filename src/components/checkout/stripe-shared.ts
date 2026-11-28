"use client";
import { loadStripe, type Appearance, type Stripe, type StripeElementsOptions } from "@stripe/stripe-js";
import type { Locale } from "@/i18n/config";

/**
 * Stripe.js helpers shared by the inline Payment Element (checkout step 5, offer page)
 * and the Express Checkout Element (product page, cart). Only imported by components
 * that are loaded with `next/dynamic`, so Stripe.js stays out of the page bundles.
 */

/** One Stripe.js instance per publishable key for the lifetime of the page. */
const stripeInstances = new Map<string, Promise<Stripe | null>>();
export function getStripe(publishableKey: string): Promise<Stripe | null> {
  let p = stripeInstances.get(publishableKey);
  if (!p) {
    p = loadStripe(publishableKey).catch((err: unknown) => {
      // A blocked or failed script must not stay cached – the next mount may retry.
      stripeInstances.delete(publishableKey);
      throw err;
    });
    stripeInstances.set(publishableKey, p);
  }
  return p;
}

/**
 * Manrope inside Stripe's iframes. The iframes cannot see our self-hosted font, so
 * Stripe loads it from Google Fonts; without it Stripe falls back to a serif.
 */
export const STRIPE_FONTS: NonNullable<StripeElementsOptions["fonts"]> = [
  { cssSrc: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" },
];

/** Ivory / forest look for the Payment Element. */
export const STRIPE_APPEARANCE: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#1f3a2d",
    colorBackground: "#ffffff",
    colorText: "#1c1c1a",
    colorDanger: "#9f2c3b",
    borderRadius: "8px",
    fontFamily: "Manrope, system-ui, sans-serif",
    fontSizeBase: "15px",
  },
};

/** Our languages → Stripe Elements locales (unsupported ones follow the browser). */
export function stripeLocale(l: Locale): StripeElementsOptions["locale"] {
  if (l === "bks") return "hr";
  if (l === "uk" || l === "fa" || l === "ce" || l === "sq") return "auto";
  if (l === "no") return "nb";
  return l;
}

/** Tells the server about a payment problem of a stored order (best effort, never throws). */
export function reportPaymentProblem(order: { orderId: string; token: string; method: string }, kind: "load_error" | "load_timeout" | "confirm_error", message?: string) {
  try {
    void fetch("/api/payments/stripe/client-event", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ orderId: order.orderId, token: order.token, kind, method: order.method, message }),
    }).catch(() => undefined);
  } catch { /* ignore */ }
}

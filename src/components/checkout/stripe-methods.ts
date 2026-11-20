import type { PaymentMethodId } from "@/types/payments";

/**
 * Swipe row above the Stripe Payment Element (checkout and offer page): one entry per
 * payment method the order's PaymentIntent allows, the method chosen in the checkout first.
 * Pure helpers – unit tested in tests/unit/stripe-methods.test.ts.
 */
/** One entry of the swipe row: a label and the Stripe payment method types it allows. */
export interface MethodSlot { id: string; types: string[] }

/** Types that never get their own entry: Link lives inside the card form. */
const INSIDE_CARD = new Set(["link"]);

/** Brand names stay as they are; only "card" is translated. */
const BRAND: Record<string, string> = {
  klarna: "Klarna", eps: "EPS", paypal: "PayPal", amazon_pay: "Amazon Pay", revolut_pay: "Revolut Pay",
  bancontact: "Bancontact", ideal: "iDEAL", sepa_debit: "SEPA", sofort: "Sofort", giropay: "giropay",
  p24: "Przelewy24", blik: "BLIK", twint: "TWINT", mobilepay: "MobilePay", kakao_pay: "Kakao Pay",
};

export function slotLabel(id: string, card: string) {
  if (id === "card") return card;
  return BRAND[id] ?? id.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Builds the swipe row from the methods Stripe allows for this intent – the chosen one first. */
export function buildSlots(types: readonly string[], chosen: PaymentMethodId): MethodSlot[] {
  const own = types.filter((t) => !INSIDE_CARD.has(t));
  const slots: MethodSlot[] = own.map((t) => ({ id: t, types: t === "card" ? types.filter((x) => x === "card" || INSIDE_CARD.has(x)) : [t] }));
  const first = chosen === "apple_pay" || chosen === "google_pay" ? "card" : chosen;
  return slots.sort((a, b) => Number(b.id === first) - Number(a.id === first));
}


/**
 * Express purchase (Stripe Express Checkout Element: Apple Pay, Google Pay, Link).
 * Pure & isomorphic helpers – unit tested in tests/unit/express.test.ts.
 *
 * The wallet sheet hands over one address line ("Wiedner Hauptstraße 12/3") and one
 * name; the order needs street, house number, first and last name separately. The
 * mapped body then runs through exactly the same validation as the checkout
 * (`parseOrderPayload` → `createOrderFromPayload`).
 */
import type { PaymentMethodId } from "@/types/payments";
import { LIMITS } from "@/lib/order-payload";

/** What the browser sends to `POST /api/express/order` besides the cart. */
export interface ExpressWalletData {
  /** `expressPaymentType` of the confirm event (apple_pay, google_pay, link …). */
  expressPaymentType: string;
  billingDetails: { name?: string; email?: string; phone?: string };
  shippingAddress: { name?: string; address?: { line1?: string; line2?: string | null; city?: string; postal_code?: string; country?: string } };
}

/** "Anna Maria Huber" → { firstName: "Anna Maria", lastName: "Huber" }. One word → both the same. */
export function splitName(name: string | undefined): { firstName: string; lastName: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

/**
 * "Wiedner Hauptstraße 12/3" → street "Wiedner Hauptstraße", house number "12/3".
 * The house number starts at the first word that begins with a digit; what does not
 * fit into the house-number field (12 characters) moves to the address addition, as
 * does the wallet's second address line. No number → empty house number (the order
 * validation then rejects the address, the wallet shows "invalid shipping address").
 */
export function splitStreet(line1: string | undefined, line2?: string | null): { street: string; houseNumber: string; addition?: string } {
  const text = (line1 ?? "").trim().replace(/\s+/g, " ");
  const match = text.match(/^(.*?\D)[\s,]+(\d.*)$/);
  let street = text;
  let houseNumber = "";
  const extra: string[] = [];
  if (match) {
    street = match[1].replace(/[\s,]+$/, "");
    // "1, Top 5" → number "1", addition "Top 5".
    const [num, ...afterComma] = match[2].trim().split(/\s*,\s*/);
    houseNumber = num;
    if (afterComma.length) extra.push(afterComma.join(", "));
    if (houseNumber.length > LIMITS.houseNumber) {
      const [first, ...rest] = houseNumber.split(" ");
      houseNumber = first.slice(0, LIMITS.houseNumber);
      if (rest.length) extra.unshift(rest.join(" "));
    }
  }
  const second = (line2 ?? "").trim();
  if (second) extra.push(second);
  const addition = extra.join(", ").slice(0, LIMITS.addition) || undefined;
  return { street, houseNumber, ...(addition ? { addition } : {}) };
}

/** Wallet → our payment method id (Link and anything else count as card). */
export function expressMethod(expressPaymentType: string): PaymentMethodId {
  if (expressPaymentType === "apple_pay" || expressPaymentType === "google_pay") return expressPaymentType;
  return "card";
}

/** Builds the `/api/orders`-shaped body from cart, chosen delivery slot and wallet data. */
export function buildExpressOrderBody(input: {
  items: unknown;
  couponCode?: string | null;
  delivery: { date?: string; windowId?: string };
  wallet: ExpressWalletData;
  locale?: string;
}) {
  const { wallet } = input;
  const buyer = splitName(wallet.billingDetails.name || wallet.shippingAddress.name);
  const recipientName = splitName(wallet.shippingAddress.name || wallet.billingDetails.name);
  const address = wallet.shippingAddress.address ?? {};
  const street = splitStreet(address.line1, address.line2);
  const phone = (wallet.billingDetails.phone ?? "").trim();
  return {
    items: input.items,
    recipient: {
      firstName: recipientName.firstName,
      lastName: recipientName.lastName,
      street: street.street,
      houseNumber: street.houseNumber,
      ...(street.addition ? { addition: street.addition } : {}),
      zip: (address.postal_code ?? "").trim(),
      city: (address.city ?? "").trim(),
      phone,
    },
    delivery: { date: input.delivery.date ?? "", ...(input.delivery.windowId ? { windowId: input.delivery.windowId } : {}) },
    customer: {
      firstName: buyer.firstName,
      lastName: buyer.lastName,
      email: (wallet.billingDetails.email ?? "").trim(),
      phone,
      acceptedTerms: true,
      newsletter: false,
    },
    payment: { method: expressMethod(wallet.expressPaymentType) },
    ...(input.couponCode ? { couponCode: input.couponCode } : {}),
    ...(input.locale ? { locale: input.locale } : {}),
  };
}

/** Euro → Stripe minor units (cents). */
export function toCents(amount: number) {
  return Math.round(amount * 100);
}

import type { PaymentMethodId } from "@/types/payments";

/**
 * One-step Stripe payment (checkout step 5 and offer page): our own method list, the
 * Payment Element of the chosen method inline, order + payment on one click.
 * Pure helpers – unit tested in tests/unit/pay-logic.test.ts.
 */

export type WalletSetting = "auto" | "never";

export interface InlineElementsConfig {
  /** `allowedPaymentMethodTypes` of the deferred Elements group. */
  types: string[];
  /** Payment Element `wallets` – only the wallet of the chosen entry may show. */
  wallets: { applePay: WalletSetting; googlePay: WalletSetting; link: WalletSetting };
  /** Payment Element `paymentMethodOrder` – the wallet tab first. */
  order?: string[];
}

/**
 * What the Payment Element shows under a list entry. Apple Pay and Google Pay are card
 * payments in Stripe (type `card`): the entry shows only its own wallet (plus the card
 * fields as Stripe's second tab), "Kreditkarte" shows only the card fields.
 * `null` for methods that are not paid through Stripe (PayPal).
 */
export function inlineElementsFor(method: PaymentMethodId): InlineElementsConfig | null {
  switch (method) {
    case "card":
      return { types: ["card"], wallets: { applePay: "never", googlePay: "never", link: "never" } };
    case "apple_pay":
      return { types: ["card"], wallets: { applePay: "auto", googlePay: "never", link: "never" }, order: ["apple_pay", "card"] };
    case "google_pay":
      return { types: ["card"], wallets: { applePay: "never", googlePay: "auto", link: "never" }, order: ["google_pay", "card"] };
    case "klarna":
      return { types: ["klarna"], wallets: { applePay: "never", googlePay: "never", link: "never" } };
    case "eps":
      return { types: ["eps"], wallets: { applePay: "never", googlePay: "never", link: "never" } };
    default:
      return null;
  }
}

/** Euro → cents, never below 1 (Elements refuses an amount of 0). */
export function displayCents(totalEur: number): number {
  return Math.max(1, Math.round(totalEur * 100));
}

/** True when the server charges something else than the Payment Element showed. */
export function amountChanged(serverTotalEur: number, shownCents: number): boolean {
  return Math.round(serverTotalEur * 100) !== shownCents;
}

/**
 * A Stripe order of this browser session that a retry may continue (same cart and
 * details, only the payment failed or was cancelled). Kept in sessionStorage – without
 * the client secret – so a return from a cancelled Klarna/EPS redirect reuses it too.
 */
export interface StripeAttempt {
  /** Fingerprint of everything that defines the order except the payment method. */
  key: string;
  id: string;
  token: string;
  /** Server-side total of the order (EUR). */
  total: number;
}

const STORAGE_KEY = "blumora-stripe-attempt";

function isAttempt(v: unknown): v is StripeAttempt {
  const a = v as StripeAttempt;
  return Boolean(a) && typeof a.key === "string" && typeof a.id === "string" && typeof a.token === "string" && typeof a.total === "number";
}

/** Reads the stored attempt for `scope` ("checkout" or an offer token). */
export function loadAttempt(scope: string, storage: Pick<Storage, "getItem"> | undefined = safeSession()): StripeAttempt | null {
  try {
    const raw = storage?.getItem(`${STORAGE_KEY}:${scope}`);
    const v: unknown = raw ? JSON.parse(raw) : null;
    return isAttempt(v) ? v : null;
  } catch {
    return null;
  }
}

export function saveAttempt(scope: string, attempt: StripeAttempt, storage: Pick<Storage, "setItem"> | undefined = safeSession()) {
  try { storage?.setItem(`${STORAGE_KEY}:${scope}`, JSON.stringify(attempt)); } catch { /* private mode */ }
}

export function clearAttempt(scope: string, storage: Pick<Storage, "removeItem"> | undefined = safeSession()) {
  try { storage?.removeItem(`${STORAGE_KEY}:${scope}`); } catch { /* private mode */ }
}

function safeSession(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Status page of an order (German path; the localized router adds the language). */
export function statusPath(id: string, token: string, extra = "") {
  return `/bestellung/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}&neu=1${extra}`;
}

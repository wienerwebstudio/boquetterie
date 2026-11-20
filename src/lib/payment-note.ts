/**
 * "Jetzt kaufen" was clicked, the order exists, but Stripe's `elements.submit()` stopped
 * (empty card fields, wallet sheet closed). Pure & isomorphic: the browser classifies
 * the Stripe error, the server turns it into the German history note of the order
 * (`POST /api/orders/payment-note`). Unit tested in tests/unit/payment-note.test.ts.
 */

export type SubmitFailureReason = "incomplete" | "wallet_closed" | "other";

export const PAYMENT_NOTE_PREFIX = "Zahlung nicht abgeschlossen";

const WALLETS: Record<string, string> = { apple_pay: "Apple Pay", google_pay: "Google Pay" };

/**
 * Classifies the error of `elements.submit()`. Incomplete/invalid fields come as
 * `validation_error` or with a code `incomplete_*` / `invalid_*`; anything else on a
 * wallet entry (Apple Pay / Google Pay) means the sheet was closed without paying.
 */
export function submitFailureReason(method: string, error: { type?: string; code?: string } | undefined): SubmitFailureReason {
  const code = error?.code ?? "";
  const fieldProblem = /^(incomplete|invalid)/.test(code);
  if (fieldProblem) return "incomplete";
  if (Object.hasOwn(WALLETS, method)) return "wallet_closed";
  if (error?.type === "validation_error") return "incomplete";
  return "other";
}

const clean = (v: string | undefined, n: number) => (v ?? "").replace(/[\r\n\t]+/g, " ").replace(/[^\p{L}\p{N} ._:/()·-]/gu, "").replace(/ {2,}/g, " ").trim().slice(0, n);

/** German note for the order history, e.g. "Zahlung nicht abgeschlossen: Apple-Pay-Fenster geschlossen". */
export function paymentNoteText(reason: SubmitFailureReason, method: string, detail?: string): string {
  const wallet = Object.hasOwn(WALLETS, method) ? WALLETS[method] : undefined;
  const extra = clean(detail, 80);
  switch (reason) {
    case "incomplete":
      return `${PAYMENT_NOTE_PREFIX}: ${method === "klarna" || method === "eps" ? `Angaben unvollständig (${method === "eps" ? "EPS" : "Klarna"})` : "Kartenangaben unvollständig"}${extra ? ` (${extra})` : ""}`;
    case "wallet_closed":
      return `${PAYMENT_NOTE_PREFIX}: ${wallet ? `${wallet.replace(" ", "-")}-Fenster geschlossen` : "Zahlungsfenster geschlossen"}${extra ? ` (${extra})` : ""}`;
    default:
      return `${PAYMENT_NOTE_PREFIX}${extra ? `: ${extra}` : ""}`;
  }
}

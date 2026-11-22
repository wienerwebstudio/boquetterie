/**
 * Partner-Portal (Stufe 1) – runtime data types. All documents live under `data/`
 * (git-ignored) or in Postgres and are read/written only through `src/lib/cms.ts`.
 * Nothing here belongs in the public repository: portal e-mails, payments and
 * amounts are business data. See docs/PARTNER-PORTAL.md.
 */

/** Per-partner portal settings (runtime document `partner-portal`, keyed by partner id). */
export interface PartnerPortalSettings {
  /**
   * Addresses that may log in to the portal. `undefined` = not configured yet:
   * the partner's order-slip addresses apply (see `portalEmailsFor`).
   */
  emails?: string[];
  /**
   * "Abrechnung ab": only orders created strictly AFTER this order count in the
   * partner's ledger (exclusive cutoff by `createdAt`).
   */
  billingFrom?: { orderId: string; createdAt: string; setAt: string };
  updatedAt?: string;
}

export type PartnerPortalDoc = Record<string, PartnerPortalSettings>;

/** A payment to a partner or a manual correction (runtime document `partner-ledger`). */
export interface PartnerLedgerEntry {
  id: string;
  partnerId: string;
  /** "payment": Blumora paid the partner (amount > 0). "correction": +/- adjustment of what is owed. */
  kind: "payment" | "correction";
  /** EUR, net. Payments are positive; corrections may be negative. */
  amount: number;
  /** YYYY-MM-DD (date of the transfer / of the correction). */
  date: string;
  /** Note (payment) or reason (correction). */
  note: string;
  createdAt: string;
  updatedAt?: string;
}

/** One magic-link token of the partner login (runtime document `partner-auth-tokens`). */
export interface PartnerTokenRecord {
  /** sha256(raw token) as hex – the raw token only lives in the e-mail. */
  tokenHash: string;
  partnerId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

/** What the `bl_partner` cookie carries – a reference, nothing sensitive. */
export interface PartnerSessionPayload {
  partnerId: string;
  /** The (lower-cased) address the partner logged in with; the session ends when it leaves the allow-list. */
  email: string;
  /** Unix seconds. */
  exp: number;
}

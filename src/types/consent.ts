/**
 * Cookie consent (DSGVO / TKG § 165 Abs 3).
 *
 * The visitor's choice lives client-side in localStorage (`bl-consent`) and is
 * mirrored to a cookie of the same name so that server components could read it
 * later. Managed by `src/components/consent/*`; consumed by
 * `src/components/analytics/*`. Bump `CONSENT_VERSION` whenever the categories
 * or the tools behind them change – older choices are then asked again.
 */

export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = "bl-consent";
export const CONSENT_COOKIE_NAME = "bl-consent";
export const CONSENT_MAX_AGE_DAYS = 180;

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentState {
  /** Always true – required for cart, delivery check and the consent choice itself. */
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  version: typeof CONSENT_VERSION;
  /** ISO datetime of the last explicit choice. */
  updatedAt: string;
}

/** What the visitor actually decides – the rest is derived. */
export type ConsentChoice = Pick<ConsentState, "analytics" | "marketing">;

"use client";
import { useEffect, useState } from "react";
import type { PaymentMethodsResponse } from "@/types/payments";
import { useI18n } from "@/i18n/client";

/**
 * Loads the truly available payment methods (`GET /api/payments/methods`).
 * Cached per page load so checkout and Blumen-Abo do not refetch on every render.
 */
let cache: Promise<PaymentMethodsResponse> | null = null;

/**
 * Wallets the Stripe form can only show on suitable devices: Apple Pay needs Safari /
 * an Apple device with Apple Pay set up, Google Pay is never offered on iPhone/iPad.
 * Offering them elsewhere makes the customer pick a method the form then does not
 * show (it falls back to the card form).
 */
export function walletUsable(id: string, nav: { userAgent: string } | undefined = typeof navigator === "undefined" ? undefined : navigator): boolean {
  if (id !== "apple_pay" && id !== "google_pay") return true;
  if (!nav) return true;
  const ios = /iPhone|iPad|iPod/.test(nav.userAgent);
  if (id === "google_pay") return !ios;
  const w = typeof window === "undefined" ? undefined : (window as unknown as { ApplePaySession?: { canMakePayments?: () => boolean } });
  try {
    return Boolean(w?.ApplePaySession?.canMakePayments?.());
  } catch {
    return false;
  }
}

async function load(): Promise<PaymentMethodsResponse> {
  const r = await fetch("/api/payments/methods", { cache: "no-store" });
  const body = (await r.json()) as Partial<PaymentMethodsResponse>;
  if (!r.ok || !body.ok || !Array.isArray(body.methods)) throw new Error("methods unavailable");
  const methods = body.methods.filter((m) => m.provider !== "stripe" || walletUsable(m.id));
  return { ok: true, methods, stripePublishableKey: body.stripePublishableKey, subscriptionCheckout: Boolean(body.subscriptionCheckout) };
}

export function fetchPaymentMethods(force = false): Promise<PaymentMethodsResponse> {
  if (!cache || force) {
    const p = load().catch((err: unknown) => {
      if (cache === p) cache = null;
      throw err;
    });
    cache = p;
  }
  return cache;
}

export function usePaymentMethods() {
  const [state, setState] = useState<{ loading: boolean; data: PaymentMethodsResponse | null; error: string | null }>({ loading: true, data: null, error: null });
  const loadFailed = useI18n().m.checkout.payment.loadFailed;
  useEffect(() => {
    let alive = true;
    fetchPaymentMethods()
      .then((data) => { if (alive) setState({ loading: false, data, error: null }); })
      .catch(() => { if (alive) setState({ loading: false, data: null, error: loadFailed }); });
    return () => { alive = false; };
  }, [loadFailed]);
  return state;
}

"use client";
import { useEffect, useState } from "react";
import type { PaymentMethodsResponse } from "@/types/payments";

/**
 * Loads the truly available payment methods (`GET /api/payments/methods`).
 * Cached per page load so checkout and Blumen-Abo do not refetch on every render.
 */
let cache: Promise<PaymentMethodsResponse> | null = null;

async function load(): Promise<PaymentMethodsResponse> {
  const r = await fetch("/api/payments/methods", { cache: "no-store" });
  const body = (await r.json()) as Partial<PaymentMethodsResponse>;
  if (!r.ok || !body.ok || !Array.isArray(body.methods)) throw new Error("methods unavailable");
  return { ok: true, methods: body.methods, stripePublishableKey: body.stripePublishableKey, subscriptionCheckout: Boolean(body.subscriptionCheckout) };
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
  useEffect(() => {
    let alive = true;
    fetchPaymentMethods()
      .then((data) => { if (alive) setState({ loading: false, data, error: null }); })
      .catch(() => { if (alive) setState({ loading: false, data: null, error: "Die Zahlungsarten konnten nicht geladen werden. Bitte lade die Seite neu." }); });
    return () => { alive = false; };
  }, []);
  return state;
}

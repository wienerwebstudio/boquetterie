"use client";
import { useCallback, useState } from "react";
import type { DeliveryZone } from "@/types";
import type { DeliveryDay, LocalNow } from "@/lib/delivery";
import { useDeliveryContext } from "@/store/delivery";
import { useI18n } from "@/i18n/client";

export interface DeliveryCheckResult {
  ok: boolean;
  available: boolean;
  postalCode: string;
  zone: DeliveryZone | null;
  days: DeliveryDay[];
  sameDayToday?: boolean;
  message?: string;
  summary?: { days: string; fee: number; freeFrom: number | null; sameDay: boolean; sameDayCutoff: string; cutoff: string };
  now?: LocalNow;
}

/** Shared hook for the PLZ check (hero, product page, checkout). Persists the result in session. */
export function useDeliveryCheck(productSlug?: string) {
  const [result, setResult] = useState<DeliveryCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setContext = useDeliveryContext((s) => s.setResult);
  const { m, locale } = useI18n();
  const t = m.checkout.deliveryCheck;

  const check = useCallback(async (plz: string) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ plz });
      if (productSlug) params.set("product", productSlug);
      // Only picks the language of the server's messages.
      if (locale !== "de") params.set("locale", locale);
      const res = await fetch(`/api/delivery/check?${params}`);
      const data = (await res.json()) as DeliveryCheckResult & { error?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? t.invalid);
        setResult(null);
        return null;
      }
      setResult(data);
      setContext(data.postalCode, data.zone);
      return data;
    } catch {
      setError(t.unreachable);
      return null;
    } finally {
      setLoading(false);
    }
  }, [productSlug, setContext, locale, t]);

  return { result, loading, error, check, reset: () => { setResult(null); setError(null); } };
}

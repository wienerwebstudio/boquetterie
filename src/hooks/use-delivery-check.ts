"use client";
import { useCallback, useState } from "react";
import type { DeliveryZone } from "@/types";
import type { DeliveryDay, LocalNow } from "@/lib/delivery";
import { useDeliveryContext } from "@/store/delivery";

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

  const check = useCallback(async (plz: string) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ plz });
      if (productSlug) params.set("product", productSlug);
      const res = await fetch(`/api/delivery/check?${params}`);
      const data = (await res.json()) as DeliveryCheckResult & { error?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Bitte gib eine gültige Postleitzahl ein.");
        setResult(null);
        return null;
      }
      setResult(data);
      setContext(data.postalCode, data.zone);
      return data;
    } catch {
      setError("Die Lieferprüfung ist gerade nicht erreichbar. Bitte versuch es gleich noch einmal.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [productSlug, setContext]);

  return { result, loading, error, check, reset: () => { setResult(null); setError(null); } };
}

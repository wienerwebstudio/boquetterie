"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Coupon, Extra } from "@/types";
import { computeTotals } from "@/lib/pricing";
import { useCart } from "@/store/cart";
import { useDeliveryContext } from "@/store/delivery";

interface ValidateResponse { ok: boolean; coupon?: Coupon; error?: string }

async function validate(code: string, subtotal: number): Promise<ValidateResponse> {
  try {
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal }),
    });
    return (await res.json()) as ValidateResponse;
  } catch {
    return { ok: false, error: "Der Gutschein konnte gerade nicht geprüft werden. Bitte versuch es gleich noch einmal." };
  }
}

/**
 * Cart totals for drawer and cart page. The store only keeps the coupon *code*;
 * the coupon itself is resolved (and re-checked when the subtotal changes) via the API.
 * Delivery is quoted with the zone from the PLZ context, or left open until checkout.
 */
export function useCartTotals() {
  const items = useCart((s) => s.items);
  const code = useCart((s) => s.coupon);
  const setCoupon = useCart((s) => s.setCoupon);
  const zone = useDeliveryContext((s) => s.zone);

  const [couponObj, setCouponObj] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const latest = useRef(0);

  const subtotal = useMemo(() => computeTotals({ items }).subtotal, [items]);

  useEffect(() => {
    if (!code) return;
    const run = ++latest.current;
    validate(code, subtotal).then((r) => {
      if (run !== latest.current) return;
      if (r.ok && r.coupon) { setCouponObj(r.coupon); setCouponError(null); }
      else { setCouponObj(null); setCouponError(r.error ?? null); }
    });
  }, [code, subtotal]);

  const apply = useCallback(async (input: string) => {
    const c = input.trim().toUpperCase();
    if (!c) { setCouponError("Bitte gib einen Gutscheincode ein."); return false; }
    setApplying(true);
    const r = await validate(c, subtotal);
    setApplying(false);
    if (r.ok && r.coupon) { setCouponObj(r.coupon); setCouponError(null); setCoupon(r.coupon.code); return true; }
    setCouponError(r.error ?? "Dieser Code ist uns nicht bekannt.");
    return false;
  }, [subtotal, setCoupon]);

  const remove = useCallback(() => { setCoupon(null); setCouponObj(null); setCouponError(null); }, [setCoupon]);

  // Only trust the resolved coupon while it still matches the stored code.
  const coupon = code && couponObj?.code === code ? couponObj : null;
  const windowId = items.find((i) => i.windowId)?.windowId;
  const totals = useMemo(() => computeTotals({ items, zone, coupon, windowId }), [items, zone, coupon, windowId]);

  return { items, totals, zone, coupon, couponCode: code, couponError, applying, apply, remove };
}

/* ---------------- Extras for the upsell strip ---------------- */

let extrasCache: Extra[] | null = null;
let extrasPromise: Promise<Extra[]> | null = null;

export function useCartExtras() {
  const [extras, setExtras] = useState<Extra[]>(extrasCache ?? []);
  useEffect(() => {
    extrasPromise ??= fetch("/api/extras?cart=1")
      .then((r) => r.json() as Promise<{ ok: boolean; extras: Extra[] }>)
      .then((d) => { extrasCache = d.ok ? d.extras : []; return extrasCache; })
      .catch(() => { extrasPromise = null; return [] as Extra[]; });
    let alive = true;
    extrasPromise.then((list) => { if (alive) setExtras(list); });
    return () => { alive = false; };
  }, []);
  return extras;
}

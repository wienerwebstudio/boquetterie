"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CartItem, DeliveryWindow } from "@/types";
import type { DeliveryDay } from "@/lib/delivery";
import { isValidAustrianPostalCode } from "@/lib/delivery";
import { useDeliveryCheck } from "@/hooks/use-delivery-check";
import { useCart } from "@/store/cart";
import { useDeliveryContext } from "@/store/delivery";

/**
 * What still has to be chosen at the cart line before the wallet sheet may open:
 * - "expired": the line's day is in the past or no longer offered (always shown);
 * - "postalCode" / "zone" / "date" / "window": missing for express (shown once a wallet is ready).
 */
export type CartDeliveryIssue = "postalCode" | "zone" | "expired" | "date" | "window";

export interface CartDeliveryState {
  /** PLZ, day and window of the order (one delivery per order; read from the cart lines). */
  postalCode: string;
  date: string;
  /** The chosen window, or the only one of the day. */
  windowId: string;
  days: DeliveryDay[];
  windows: DeliveryWindow[];
  loading: boolean;
  checkError: string | null;
  /** Everything known and offered by the zone: the express sheet may open. */
  complete: boolean;
  issue: CartDeliveryIssue | null;
  /** The issue as the line shows it (missing fields only once a wallet button is ready). */
  visibleIssue: CartDeliveryIssue | null;
  /** The cart line that shows the notice and fields. */
  anchorId: string | null;
  /** Incremented when the wallet button was tapped with something missing – the anchor line scrolls into view. */
  attention: number;
  requestAttention: () => void;
  /** True once per attention request (the anchor line scrolls and focuses only once). */
  takeAttention: () => boolean;
  walletReady: boolean;
  setWalletReady: (ready: boolean) => void;
  setPostalCode: (plz: string) => void;
  setDate: (date: string) => void;
  setWindow: (windowId: string) => void;
}

const Ctx = createContext<CartDeliveryState | null>(null);

/** The delivery slot of the cart, shared by the cart lines and the express block (drawer, cart page). */
export function CartDeliveryProvider({ items, active = true, children }: { items: CartItem[]; active?: boolean; children: React.ReactNode }) {
  const setDelivery = useCart((s) => s.setDelivery);
  const ctxZip = useDeliveryContext((s) => s.postalCode);
  const restrictiveSlug = useMemo(() => items.find((i) => !i.snapshot.sameDayCapable)?.snapshot.slug ?? items[0]?.snapshot.slug, [items]);
  const { result, loading, error: checkError, check } = useDeliveryCheck(restrictiveSlug);
  const [walletReady, setWalletReady] = useState(false);
  const [attention, setAttention] = useState(0);
  const checked = useRef<string | null>(null);
  const handled = useRef(0);

  const postalCode = items.find((i) => i.postalCode)?.postalCode || ctxZip || "";
  const dated = items.find((i) => i.deliveryDate);
  const date = dated?.deliveryDate ?? "";
  const windowChoice = items.find((i) => i.windowId)?.windowId ?? "";
  const anchorId = (dated ?? items[0])?.id ?? null;

  useEffect(() => {
    if (!active || !isValidAustrianPostalCode(postalCode) || checked.current === postalCode) return;
    const timer = setTimeout(() => { checked.current = postalCode; void check(postalCode); }, 250);
    return () => clearTimeout(timer);
  }, [active, postalCode, check]);

  const zoneResult = result && result.postalCode === postalCode ? result : null;
  const days = useMemo(() => (zoneResult?.available ? zoneResult.days : []), [zoneResult]);
  const day = days.find((d) => d.date === date);
  const windows = useMemo(() => day?.windows ?? [], [day]);
  const windowId = windows.length === 1 ? windows[0].id : windows.some((w) => w.id === windowChoice) ? windowChoice : "";

  let issue: CartDeliveryIssue | null = null;
  if (!isValidAustrianPostalCode(postalCode) || (checkError && !zoneResult)) issue = "postalCode";
  else if (zoneResult && !zoneResult.available) issue = "zone";
  else if (zoneResult && date && !day) issue = "expired";
  else if (zoneResult && !date) issue = "date";
  else if (zoneResult && windows.length > 1 && !windowId) issue = "window";
  const complete = Boolean(zoneResult?.available && day && (windows.length === 0 || windowId));
  const visibleIssue = issue && (issue === "expired" || walletReady || attention > 0) ? issue : null;

  const forAll = useCallback((patch: Parameters<typeof setDelivery>[1]) => {
    for (const i of useCart.getState().items) setDelivery(i.id, patch);
  }, [setDelivery]);
  const setPostalCode = useCallback((plz: string) => forAll({ postalCode: plz }), [forAll]);
  const setDate = useCallback((next: string) => {
    const nextWindows = days.find((d) => d.date === next)?.windows ?? [];
    forAll({ deliveryDate: next, ...(nextWindows.some((w) => w.id === windowChoice) ? {} : { windowId: undefined }) });
  }, [days, windowChoice, forAll]);
  const setWindow = useCallback((id: string) => forAll({ windowId: id }), [forAll]);
  const requestAttention = useCallback(() => setAttention((n) => n + 1), []);
  const takeAttention = useCallback(() => {
    if (attention <= handled.current) return false;
    handled.current = attention;
    return true;
  }, [attention]);

  const value = useMemo<CartDeliveryState>(() => ({
    postalCode, date, windowId, days, windows, loading, checkError, complete, issue, visibleIssue, anchorId,
    attention, requestAttention, takeAttention, walletReady, setWalletReady, setPostalCode, setDate, setWindow,
  }), [postalCode, date, windowId, days, windows, loading, checkError, complete, issue, visibleIssue, anchorId, attention, requestAttention, takeAttention, walletReady, setPostalCode, setDate, setWindow]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Null outside a provider (e.g. a cart line rendered elsewhere). */
export function useCartDelivery() {
  return useContext(Ctx);
}

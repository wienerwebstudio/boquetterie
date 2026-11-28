"use client";
import { useEffect, useRef } from "react";
import { computeTotals } from "@/lib/pricing";
import { cartCount, useCart } from "@/store/cart";
import { events, track } from "@/components/analytics/track";

/**
 * Sends `view_cart` each time `visible` turns true (drawer opened, cart page mounted),
 * once the persisted cart is hydrated. Changing the cart while it is open does not re-send.
 */
export function useViewCartTracking(visible: boolean) {
  const hydrated = useCart((s) => s.hydrated);
  const sent = useRef(false);
  useEffect(() => {
    if (!visible) { sent.current = false; return; }
    if (!hydrated || sent.current) return;
    sent.current = true;
    const items = useCart.getState().items;
    track(events.viewCart, { cart_value: computeTotals({ items }).subtotal, item_count: cartCount(items) });
  }, [visible, hydrated]);
}

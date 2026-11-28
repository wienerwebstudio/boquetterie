"use client";
import { useEffect } from "react";
import { useCart } from "@/store/cart";
import { clearCheckout } from "./checkout-state";

/**
 * Mounted on the order status page when the customer arrives right after
 * placing the order (`?neu=1`) – also after provider redirects (PayPal, EPS),
 * where the checkout never got the chance to clear the cart itself.
 */
export function OrderPlacedCleanup() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
    clearCheckout();
  }, [clear]);
  return null;
}

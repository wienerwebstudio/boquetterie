/**
 * Cart pricing – pure and isomorphic. The client uses cart snapshots for display;
 * the server recomputes with the live catalog before an order is stored.
 */
import type { CartItem, Coupon, DeliveryZone } from "@/types";
import { quoteDelivery } from "@/lib/delivery";

export interface CartTotals {
  itemsSubtotal: number; // bouquets only
  extrasSubtotal: number;
  subtotal: number; // items + extras
  delivery: number;
  deliveryBase: number;
  deliverySurcharge: number;
  discount: number;
  total: number;
  freeDeliveryFrom: number | null;
  missingForFreeDelivery: number | null;
  belowMinOrder: boolean;
  minOrder: number;
  couponError?: string;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function lineTotal(item: CartItem) {
  const extras = item.extras.reduce((s, e) => s + e.price * e.quantity, 0);
  return round2(item.snapshot.unitPrice * item.quantity + extras);
}

export function validateCoupon(coupon: Coupon | null | undefined, subtotal: number, today: string): { ok: boolean; error?: string } {
  if (!coupon) return { ok: false, error: "Dieser Code ist uns nicht bekannt." };
  if (!coupon.active) return { ok: false, error: "Dieser Code ist nicht mehr gültig." };
  if (coupon.validFrom && today < coupon.validFrom) return { ok: false, error: "Dieser Code ist noch nicht gültig." };
  if (coupon.validUntil && today > coupon.validUntil) return { ok: false, error: "Dieser Code ist abgelaufen." };
  if (subtotal < coupon.minOrder) return { ok: false, error: `Dieser Code gilt ab einem Bestellwert von ${coupon.minOrder.toFixed(2).replace(".", ",")} €.` };
  return { ok: true };
}

export function computeTotals(opts: {
  items: CartItem[];
  zone?: DeliveryZone | null;
  windowId?: string;
  coupon?: Coupon | null;
  today?: string;
}): CartTotals {
  const { items, zone, windowId, coupon } = opts;
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const itemsSubtotal = round2(items.reduce((s, i) => s + i.snapshot.unitPrice * i.quantity, 0));
  const extrasSubtotal = round2(items.reduce((s, i) => s + i.extras.reduce((x, e) => x + e.price * e.quantity, 0), 0));
  const subtotal = round2(itemsSubtotal + extrasSubtotal);

  let discount = 0;
  let couponError: string | undefined;
  let freeShipping = false;
  if (coupon) {
    const v = validateCoupon(coupon, subtotal, today);
    if (!v.ok) couponError = v.error;
    else if (coupon.type === "percent") discount = round2(subtotal * (coupon.value / 100));
    else if (coupon.type === "fixed") discount = Math.min(subtotal, coupon.value);
    else if (coupon.type === "free_shipping") freeShipping = true;
  }

  let delivery = 0, deliveryBase = 0, deliverySurcharge = 0, freeDeliveryFrom: number | null = null;
  let belowMinOrder = false, minOrder = 0;
  if (zone) {
    const q = quoteDelivery(zone, subtotal, windowId);
    deliveryBase = freeShipping ? 0 : q.baseFee;
    deliverySurcharge = q.surcharge;
    delivery = round2(deliveryBase + deliverySurcharge);
    freeDeliveryFrom = q.freeFrom;
    belowMinOrder = q.belowMinOrder;
    minOrder = q.minOrder;
  }
  const missingForFreeDelivery = freeDeliveryFrom !== null && subtotal < freeDeliveryFrom ? round2(freeDeliveryFrom - subtotal) : null;
  const total = round2(Math.max(0, subtotal - discount) + delivery);
  return { itemsSubtotal, extrasSubtotal, subtotal, delivery, deliveryBase, deliverySurcharge, discount, total, freeDeliveryFrom, missingForFreeDelivery, belowMinOrder, minOrder, couponError };
}

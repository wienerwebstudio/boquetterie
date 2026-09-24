"use client";
import type { CartItem, PaymentMethodConfig } from "@/types";
import {
  validateCustomerFields, validateDeliveryFields, validateGreetingFields, validateRecipientFields, type FieldErrors, type OrderPayload,
} from "@/lib/order-payload";

export type StepId = 1 | 2 | 3 | 4 | 5;

export const STEPS: { id: StepId; label: string; title: string }[] = [
  { id: 1, label: "Empfänger", title: "Wohin dürfen wir liefern?" },
  { id: 2, label: "Lieferung", title: "Wann soll der Strauß ankommen?" },
  { id: 3, label: "Grußkarte", title: "Deine Worte auf der Karte" },
  { id: 4, label: "Besteller", title: "Deine Kontaktdaten" },
  { id: 5, label: "Bezahlung", title: "Fast geschafft" },
];

export interface CheckoutData {
  step: StepId;
  recipient: {
    firstName: string; lastName: string; company: string; street: string; houseNumber: string;
    addition: string; zip: string; city: string; phone: string;
  };
  delivery: { date: string; windowId: string; note: string };
  greeting: { message: string; anonymous: boolean; senderName: string };
  customer: { firstName: string; lastName: string; email: string; phone: string; acceptedTerms: boolean; newsletter: boolean };
  payment: { method: PaymentMethodConfig["id"] | "" };
}

export const EMPTY_CHECKOUT: CheckoutData = {
  step: 1,
  recipient: { firstName: "", lastName: "", company: "", street: "", houseNumber: "", addition: "", zip: "", city: "", phone: "" },
  delivery: { date: "", windowId: "", note: "" },
  greeting: { message: "", anonymous: false, senderName: "" },
  customer: { firstName: "", lastName: "", email: "", phone: "", acceptedTerms: false, newsletter: false },
  payment: { method: "" },
};

const STORAGE_KEY = "bloomery-checkout";

export function loadCheckout(): CheckoutData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutData>;
    return {
      step: [1, 2, 3, 4, 5].includes(parsed.step as number) ? (parsed.step as StepId) : 1,
      recipient: { ...EMPTY_CHECKOUT.recipient, ...(parsed.recipient ?? {}) },
      delivery: { ...EMPTY_CHECKOUT.delivery, ...(parsed.delivery ?? {}) },
      greeting: { ...EMPTY_CHECKOUT.greeting, ...(parsed.greeting ?? {}) },
      customer: { ...EMPTY_CHECKOUT.customer, ...(parsed.customer ?? {}) },
      payment: { ...EMPTY_CHECKOUT.payment, ...(parsed.payment ?? {}) },
    };
  } catch {
    return null;
  }
}

export function saveCheckout(data: CheckoutData) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable – the form still works for this page view */
  }
}

export function clearCheckout() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Fill empty fields from the first cart item that carries delivery/greeting details and the PLZ context. */
export function prefillFromCart(data: CheckoutData, items: CartItem[], contextZip: string): CheckoutData {
  const withDate = items.find((i) => i.deliveryDate) ?? items[0];
  const withMsg = items.find((i) => i.message || i.senderName || i.anonymous);
  const zip = data.recipient.zip || withDate?.postalCode || items.find((i) => i.postalCode)?.postalCode || contextZip || "";
  const city = data.recipient.city || (isViennaZip(zip) ? "Wien" : "");
  return {
    ...data,
    recipient: { ...data.recipient, zip, city },
    delivery: {
      ...data.delivery,
      date: data.delivery.date || withDate?.deliveryDate || "",
      windowId: data.delivery.windowId || withDate?.windowId || "",
    },
    greeting: withMsg && !data.greeting.message && !data.greeting.senderName
      ? { message: withMsg.message ?? "", anonymous: Boolean(withMsg.anonymous), senderName: withMsg.senderName ?? "" }
      : data.greeting,
  };
}

export function isViennaZip(zip: string) {
  return /^1\d{3}$/.test(zip);
}

/* ---------------- Per-step validation ---------------- */

export function validateStep(step: StepId, data: CheckoutData, ctx: { zoneAvailable: boolean | null; greetingMaxChars: number; dateAvailable: boolean; windowRequired: boolean; windowValid: boolean }): FieldErrors {
  switch (step) {
    case 1: {
      const e = validateRecipientFields(data.recipient);
      if (!e.zip && ctx.zoneAvailable === false) e.zip = "In dieses Gebiet liefern wir derzeit leider noch nicht.";
      return e;
    }
    case 2: {
      const e = validateDeliveryFields({ date: data.delivery.date, windowId: data.delivery.windowId || undefined, note: data.delivery.note });
      if (!e.date && !ctx.dateAvailable) e.date = "An diesem Tag liefern wir leider nicht. Bitte wähle ein anderes Datum.";
      if (!e.date && ctx.windowRequired && !data.delivery.windowId) e.windowId = "Bitte wähle ein Zeitfenster.";
      else if (!e.date && data.delivery.windowId && !ctx.windowValid) e.windowId = "Dieses Zeitfenster ist an dem Tag nicht verfügbar.";
      return e;
    }
    case 3:
      return validateGreetingFields(data.greeting, ctx.greetingMaxChars);
    case 4:
      return validateCustomerFields(data.customer);
    case 5:
      return data.payment.method ? {} : { method: "Bitte wähle eine Zahlungsart." };
  }
}

export const SCOPE_BY_STEP: Record<StepId, string> = { 1: "recipient", 2: "delivery", 3: "greeting", 4: "customer", 5: "payment" };

export function fieldId(step: StepId, field: string) {
  return `${SCOPE_BY_STEP[step]}-${field}`;
}

/** Moves focus to the first invalid field of a step (order = DOM order of the ids). */
export function focusFirstError(step: StepId, errors: FieldErrors) {
  const ids = Object.keys(errors).map((k) => fieldId(step, k));
  if (!ids.length) return;
  const el = ids
    .map((id) => document.getElementById(id))
    .filter((n): n is HTMLElement => Boolean(n))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))[0];
  if (!el) return;
  const target = el.getAttribute("role") === "radiogroup" ? el.querySelector<HTMLElement>("input,button") ?? el : el;
  target.focus({ preventScroll: true });
  el.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** Maps API error keys ("recipient.zip") back to a step + field. */
export function stepForErrorKey(key: string): { step: StepId; field: string } | null {
  const [scope, field = ""] = key.split(".");
  const entry = (Object.entries(SCOPE_BY_STEP) as [string, string][]).find(([, s]) => s === scope);
  if (!entry) return null;
  return { step: Number(entry[0]) as StepId, field };
}

/* ---------------- Payload ---------------- */

export function buildPayload(data: CheckoutData, items: CartItem[], couponCode: string | null): OrderPayload {
  const greeting = {
    message: data.greeting.message.trim() || undefined,
    anonymous: data.greeting.anonymous,
    senderName: data.greeting.anonymous ? undefined : data.greeting.senderName.trim() || undefined,
  };
  return {
    items: items.map((i) => ({
      productId: i.productId, sizeId: i.sizeId, quantity: i.quantity,
      extras: i.extras.map((e) => ({ extraId: e.extraId, quantity: e.quantity })),
      ...greeting,
    })),
    recipient: {
      firstName: data.recipient.firstName.trim(), lastName: data.recipient.lastName.trim(),
      company: data.recipient.company.trim() || undefined,
      street: data.recipient.street.trim(), houseNumber: data.recipient.houseNumber.trim(),
      addition: data.recipient.addition.trim() || undefined,
      zip: data.recipient.zip.trim(), city: data.recipient.city.trim(), phone: data.recipient.phone.trim(),
    },
    delivery: { date: data.delivery.date, windowId: data.delivery.windowId || undefined, note: data.delivery.note.trim() || undefined },
    customer: {
      firstName: data.customer.firstName.trim(), lastName: data.customer.lastName.trim(),
      email: data.customer.email.trim(), phone: data.customer.phone.trim(),
      acceptedTerms: data.customer.acceptedTerms, newsletter: data.customer.newsletter,
    },
    payment: { method: data.payment.method as PaymentMethodConfig["id"] },
    couponCode: couponCode ?? undefined,
  };
}

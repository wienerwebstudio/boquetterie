/**
 * Order payload – the shape the checkout POSTs to `/api/orders`, plus the
 * field-level validators shared by the client (inline validation) and the
 * server (authoritative validation). Pure & isomorphic – no I/O here.
 */
import type { PaymentMethodConfig, SizeId } from "@/types";

export interface OrderPayloadItem {
  productId: string;
  sizeId: SizeId;
  quantity: number;
  extras: { extraId: string; quantity: number }[];
  message?: string;
  anonymous?: boolean;
  senderName?: string;
}

export interface OrderPayloadRecipient {
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  houseNumber: string;
  addition?: string;
  zip: string;
  city: string;
  phone: string;
}

export interface OrderPayloadDelivery {
  date: string; // YYYY-MM-DD
  windowId?: string;
  note?: string;
}

export interface OrderPayloadCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  acceptedTerms: boolean;
  newsletter?: boolean;
}

export interface OrderPayload {
  items: OrderPayloadItem[];
  recipient: OrderPayloadRecipient;
  delivery: OrderPayloadDelivery;
  customer: OrderPayloadCustomer;
  payment: { method: PaymentMethodConfig["id"] };
  couponCode?: string;
}

export type FieldErrors = Record<string, string>;

export const LIMITS = {
  name: 80,
  company: 120,
  street: 120,
  houseNumber: 12,
  addition: 40,
  phone: 30,
  email: 120,
  note: 300,
} as const;

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Accepts international and local formats, e.g. "+43 664 1234567" or "0664 1234567". */
export function isPhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  return /^\+?\d{6,15}$/.test(digits);
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const required = (v: string | undefined, msg: string) => (!v || !v.trim() ? msg : undefined);
const tooLong = (v: string | undefined, max: number) => (v && v.trim().length > max ? `Maximal ${max} Zeichen.` : undefined);

export function validateRecipientFields(r: Partial<OrderPayloadRecipient>): FieldErrors {
  const e: FieldErrors = {};
  const set = (k: string, msg?: string) => { if (msg && !e[k]) e[k] = msg; };
  set("firstName", required(r.firstName, "Bitte gib den Vornamen an.") ?? tooLong(r.firstName, LIMITS.name));
  set("lastName", required(r.lastName, "Bitte gib den Nachnamen an.") ?? tooLong(r.lastName, LIMITS.name));
  set("company", tooLong(r.company, LIMITS.company));
  set("street", required(r.street, "Bitte gib die Straße an.") ?? tooLong(r.street, LIMITS.street));
  set("houseNumber", required(r.houseNumber, "Bitte gib die Hausnummer an.") ?? tooLong(r.houseNumber, LIMITS.houseNumber));
  set("addition", tooLong(r.addition, LIMITS.addition));
  if (!r.zip || !/^[1-9]\d{3}$/.test(r.zip.trim())) set("zip", "Bitte gib eine gültige Postleitzahl ein.");
  set("city", required(r.city, "Bitte gib den Ort an.") ?? tooLong(r.city, LIMITS.name));
  if (!r.phone || !r.phone.trim()) set("phone", "Bitte gib eine Telefonnummer für die Zustellung an.");
  else if (!isPhone(r.phone)) set("phone", "Bitte gib eine gültige Telefonnummer ein.");
  return e;
}

export function validateCustomerFields(c: Partial<OrderPayloadCustomer>): FieldErrors {
  const e: FieldErrors = {};
  const set = (k: string, msg?: string) => { if (msg && !e[k]) e[k] = msg; };
  set("firstName", required(c.firstName, "Bitte gib deinen Vornamen an.") ?? tooLong(c.firstName, LIMITS.name));
  set("lastName", required(c.lastName, "Bitte gib deinen Nachnamen an.") ?? tooLong(c.lastName, LIMITS.name));
  if (!c.email || !c.email.trim()) set("email", "Bitte gib deine E-Mail-Adresse an.");
  else if (!isEmail(c.email) || c.email.length > LIMITS.email) set("email", "Bitte gib eine gültige E-Mail-Adresse ein.");
  if (!c.phone || !c.phone.trim()) set("phone", "Bitte gib deine Telefonnummer an.");
  else if (!isPhone(c.phone)) set("phone", "Bitte gib eine gültige Telefonnummer ein.");
  if (!c.acceptedTerms) set("acceptedTerms", "Bitte bestätige die AGB und die Datenschutzerklärung.");
  return e;
}

export function validateGreetingFields(g: { message?: string; anonymous?: boolean; senderName?: string }, maxChars: number): FieldErrors {
  const e: FieldErrors = {};
  if ((g.message ?? "").length > maxChars) e.message = `Die Grußbotschaft darf maximal ${maxChars} Zeichen lang sein.`;
  if (!g.anonymous && (g.senderName ?? "").trim().length > LIMITS.name) e.senderName = `Maximal ${LIMITS.name} Zeichen.`;
  return e;
}

export function validateDeliveryFields(d: Partial<OrderPayloadDelivery>): FieldErrors {
  const e: FieldErrors = {};
  if (!d.date || !isIsoDate(d.date)) e.date = "Bitte wähle ein Lieferdatum.";
  if (d.note && d.note.length > LIMITS.note) e.note = `Maximal ${LIMITS.note} Zeichen.`;
  return e;
}

/** Trims all string fields; keeps optional fields undefined when empty. */
export function cleanString(v: unknown, max = 500): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, max);
  return t.length ? t : undefined;
}

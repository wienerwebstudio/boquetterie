/**
 * Order payload – the shape the checkout POSTs to `/api/orders`, plus the
 * field-level validators shared by the client (inline validation) and the
 * server (authoritative validation). Pure & isomorphic – no I/O here.
 */
import type { PaymentMethodConfig, SizeId } from "@/types";
import { fmt } from "@/i18n/format";
import checkoutDe from "@/i18n/messages/de/checkout";

/** Validation texts (from the `checkout` dictionary); German when none are given. */
export type ValidationMessages = typeof checkoutDe.validation;
const DE: ValidationMessages = checkoutDe.validation;

export interface OrderPayloadItem {
  productId: string;
  sizeId: SizeId;
  quantity: number;
  extras: { extraId: string; quantity: number }[];
  message?: string;
  anonymous?: boolean;
  senderName?: string;
  colorId?: string;
  floristNote?: string;
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
const tooLong = (v: string | undefined, max: number, t: ValidationMessages) => (v && v.trim().length > max ? fmt(t.tooLong, { max }) : undefined);

export function validateRecipientFields(r: Partial<OrderPayloadRecipient>, t: ValidationMessages = DE): FieldErrors {
  const e: FieldErrors = {};
  const set = (k: string, msg?: string) => { if (msg && !e[k]) e[k] = msg; };
  set("firstName", required(r.firstName, t.recipientFirstName) ?? tooLong(r.firstName, LIMITS.name, t));
  set("lastName", required(r.lastName, t.recipientLastName) ?? tooLong(r.lastName, LIMITS.name, t));
  set("company", tooLong(r.company, LIMITS.company, t));
  set("street", required(r.street, t.street) ?? tooLong(r.street, LIMITS.street, t));
  set("houseNumber", required(r.houseNumber, t.houseNumber) ?? tooLong(r.houseNumber, LIMITS.houseNumber, t));
  set("addition", tooLong(r.addition, LIMITS.addition, t));
  if (!r.zip || !/^[1-9]\d{3}$/.test(r.zip.trim())) set("zip", t.zip);
  set("city", required(r.city, t.city) ?? tooLong(r.city, LIMITS.name, t));
  if (!r.phone || !r.phone.trim()) set("phone", t.recipientPhone);
  else if (!isPhone(r.phone)) set("phone", t.phoneInvalid);
  return e;
}

export function validateCustomerFields(c: Partial<OrderPayloadCustomer>, t: ValidationMessages = DE): FieldErrors {
  const e: FieldErrors = {};
  const set = (k: string, msg?: string) => { if (msg && !e[k]) e[k] = msg; };
  set("firstName", required(c.firstName, t.customerFirstName) ?? tooLong(c.firstName, LIMITS.name, t));
  set("lastName", required(c.lastName, t.customerLastName) ?? tooLong(c.lastName, LIMITS.name, t));
  if (!c.email || !c.email.trim()) set("email", t.email);
  else if (!isEmail(c.email) || c.email.length > LIMITS.email) set("email", t.emailInvalid);
  if (!c.phone || !c.phone.trim()) set("phone", t.customerPhone);
  else if (!isPhone(c.phone)) set("phone", t.phoneInvalid);
  if (!c.acceptedTerms) set("acceptedTerms", t.acceptTerms);
  return e;
}

export function validateGreetingFields(g: { message?: string; anonymous?: boolean; senderName?: string }, maxChars: number, t: ValidationMessages = DE): FieldErrors {
  const e: FieldErrors = {};
  if ((g.message ?? "").length > maxChars) e.message = fmt(t.greetingTooLong, { max: maxChars });
  if (!g.anonymous && (g.senderName ?? "").trim().length > LIMITS.name) e.senderName = fmt(t.tooLong, { max: LIMITS.name });
  return e;
}

export function validateDeliveryFields(d: Partial<OrderPayloadDelivery>, t: ValidationMessages = DE): FieldErrors {
  const e: FieldErrors = {};
  if (!d.date || !isIsoDate(d.date)) e.date = t.date;
  if (d.note && d.note.length > LIMITS.note) e.note = fmt(t.tooLong, { max: LIMITS.note });
  return e;
}

/** Trims all string fields; keeps optional fields undefined when empty. */
export function cleanString(v: unknown, max = 500): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, max);
  return t.length ? t : undefined;
}

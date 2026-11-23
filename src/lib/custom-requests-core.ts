/**
 * Customer requests ("Anfrage", page /anfrage) – options, validation and the mapping
 * onto the admin offer form. Pure and client-safe: the form, the API route, the admin
 * and the unit tests share it. Storage: src/lib/custom-requests.ts. See docs/INQUIRIES.md.
 */
import type { CustomRequest, CustomRequestStatus } from "@/types";
import { emptyItem, type OfferFormState } from "@/components/admin/offer-form-state";

/** "Worum geht es?" – multi-select; values are stored, labels are translated (namespace `inquiry`). */
export const CUSTOM_REQUEST_TOPICS = ["time", "place", "product", "large", "custom", "other"] as const;
export type CustomRequestTopic = (typeof CUSTOM_REQUEST_TOPICS)[number];

export const CUSTOM_REQUEST_BUDGETS = ["b50", "b100", "b200", "over200", "open"] as const;
export type CustomRequestBudget = (typeof CUSTOM_REQUEST_BUDGETS)[number];
/** The budget is only asked for (and stored) with these topics. */
export const BUDGET_TOPICS: readonly CustomRequestTopic[] = ["large", "custom"];

export const CUSTOM_REQUEST_STATUSES: readonly CustomRequestStatus[] = ["new", "answered", "offer", "done"];

/* ---- German labels for the admin and the team mail ---- */
export const STATUS_LABELS: Record<CustomRequestStatus, string> = { new: "Neu", answered: "Beantwortet", offer: "Angebot erstellt", done: "Erledigt" };
export const TOPIC_LABELS: Record<CustomRequestTopic, string> = {
  time: "Bestimmte Uhrzeit",
  place: "Besonderer Lieferort",
  product: "Bestimmter Strauß aus dem Shop",
  large: "Größere Bestellung / Firma",
  custom: "Eigener Wunschstrauß",
  other: "Sonstiges",
};
export const BUDGET_LABELS: Record<CustomRequestBudget, string> = { b50: "bis 50 €", b100: "50–100 €", b200: "100–200 €", over200: "über 200 €", open: "offen" };

export const CUSTOM_REQUEST_LIMITS = { name: 120, email: 200, phone: 40, time: 60, place: 200, message: 2000, note: 2000, slug: 120 } as const;
/** Photo as it arrives at the server (the form shrinks it before sending). */
export const MAX_REQUEST_PHOTO_BYTES = 15 * 1024 * 1024;
/** Whole multipart body: one photo plus text fields. */
export const MAX_REQUEST_BODY_BYTES = MAX_REQUEST_PHOTO_BYTES + 512 * 1024;
/** What the file picker offers. iOS converts HEIC to JPEG for such an input. */
export const REQUEST_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
/** Longest side the browser scales a photo to before upload (keeps requests small on Netlify). */
export const CLIENT_PHOTO_MAX_SIDE = 2000;

export const CUSTOM_REQUEST_ID_RE = /^AF-[A-Z0-9]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s/().-]{6,}$/;
const SLUG_RE = /^[a-z0-9-]{1,120}$/;

export interface CustomRequestFields {
  name: string;
  email: string;
  phone: string;
  topics: CustomRequestTopic[];
  productSlug: string;
  date: string;
  time: string;
  flexible: boolean;
  place: string;
  budget: CustomRequestBudget | "";
  message: string;
  consent: boolean;
  locale: string;
  /** Honeypot. */
  website: string;
}

/** Field → key of `inquiry.errors` (the UI translates it, the API returns it). */
export type CustomRequestErrorKey = "name" | "email" | "phone" | "message" | "messageTooLong" | "consent" | "date" | "photoType" | "photoHeic" | "photoSize";
export type CustomRequestErrors = Partial<Record<"name" | "email" | "phone" | "message" | "consent" | "date" | "photo", CustomRequestErrorKey>>;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const truthy = (v: unknown) => v === true || v === "true" || v === "on" || v === "1";

/** Reads the fields from a multipart form or a JSON body. Unknown topics/budgets are dropped. */
export function readCustomRequestFields(source: FormData | Record<string, unknown>): CustomRequestFields {
  const get = (k: string): unknown => (source instanceof FormData ? source.get(k) : source[k]);
  const rawTopics: unknown[] = source instanceof FormData ? source.getAll("topics") : Array.isArray(source.topics) ? source.topics : [];
  const topics = CUSTOM_REQUEST_TOPICS.filter((t) => rawTopics.includes(t));
  const budget = str(get("budget"), 20);
  const message = typeof get("message") === "string" ? String(get("message")).replace(/\r\n/g, "\n").trim() : "";
  return {
    name: str(get("name"), CUSTOM_REQUEST_LIMITS.name),
    email: str(get("email"), CUSTOM_REQUEST_LIMITS.email),
    phone: str(get("phone"), CUSTOM_REQUEST_LIMITS.phone),
    topics,
    productSlug: str(get("product"), CUSTOM_REQUEST_LIMITS.slug).toLowerCase(),
    date: str(get("date"), 10),
    time: str(get("time"), CUSTOM_REQUEST_LIMITS.time),
    flexible: truthy(get("flexible")),
    place: str(get("place"), CUSTOM_REQUEST_LIMITS.place),
    budget: (CUSTOM_REQUEST_BUDGETS as readonly string[]).includes(budget) && topics.some((t) => BUDGET_TOPICS.includes(t)) ? (budget as CustomRequestBudget) : "",
    // Not cut here: an over-long message is an error, not silently shortened.
    message,
    consent: truthy(get("consent")),
    locale: str(get("locale"), 5),
    website: typeof get("website") === "string" ? String(get("website")) : "",
  };
}

/** `today` (YYYY-MM-DD, shop time) rejects dates in the past. */
export function validateCustomRequest(f: CustomRequestFields, today?: string): CustomRequestErrors {
  const e: CustomRequestErrors = {};
  if (f.name.trim().length < 2) e.name = "name";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "email";
  if (f.phone && (!PHONE_RE.test(f.phone) || f.phone.replace(/\D/g, "").length < 6)) e.phone = "phone";
  if (f.date && (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || Number.isNaN(Date.parse(`${f.date}T12:00:00Z`)) || (today && f.date < today))) e.date = "date";
  if (f.message.trim().length < 10) e.message = "message";
  else if (f.message.length > CUSTOM_REQUEST_LIMITS.message) e.message = "messageTooLong";
  if (!f.consent) e.consent = "consent";
  return e;
}

export function isValidProductSlug(slug: string) {
  return SLUG_RE.test(slug);
}

/* ---------------- Admin helpers ---------------- */

/** wa.me link for a phone number (Austrian numbers without country code get +43). */
export function whatsappLink(phone: string | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("0")) digits = `43${digits.slice(1)}`;
  digits = digits.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

export function telLink(phone: string | undefined): string | null {
  if (!phone) return null;
  const t = phone.replace(/[^\d+]/g, "");
  return t.length >= 6 ? `tel:${t}` : null;
}

/** "Anna Maria Huber" → first "Anna Maria", last "Huber"; one word → first name only. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

const pad = (h: string, m?: string) => `${h.padStart(2, "0")}:${m ?? "00"}`;
const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** "14–16 Uhr", "14:00-16:30", "von 9 bis 11" → { from, to }; anything else → null. */
export function parseTimeWindow(text: string | undefined): { from: string; to: string } | null {
  if (!text) return null;
  const m = /^\s*(?:ab\s+|von\s+|from\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr|h)?\s*(?:-|–|—|bis|to)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr|h)?\s*$/i.exec(text);
  if (!m) return null;
  const from = pad(m[1], m[2]);
  const to = pad(m[3], m[4]);
  if (!validTime(from) || !validTime(to) || to <= from) return null;
  return { from, to };
}

type Recipient = OfferFormState["recipient"];

/**
 * Free place text → recipient fields. "Mariahilfer Straße 12, 1060 Wien" becomes an
 * address; everything else (venues, market stands …) a meeting point described in
 * `addition`, with the ZIP taken over when the text contains one.
 */
export function parsePlace(place: string | undefined): Pick<Recipient, "kind" | "street" | "houseNumber" | "addition" | "zip" | "city"> {
  const text = (place ?? "").trim();
  const address = /^(.+?)\s+(\d+[a-zA-Z]?(?:[/-]\d+[a-zA-Z]?)*)\s*,\s*(\d{4})\s+(.+)$/.exec(text);
  if (address && /[a-zäöüß]/i.test(address[1])) {
    return { kind: "address", street: address[1].slice(0, 120), houseNumber: address[2].slice(0, 12), addition: "", zip: address[3], city: address[4].slice(0, 80) };
  }
  const zip = /\b(\d{4})\b/.exec(text)?.[1] ?? "";
  return { kind: "meeting", street: "", houseNumber: "", addition: text.slice(0, 120), zip, city: "Wien" };
}

const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export interface PrefillProduct { id: string; slug: string; name: string; sizes: { id: string; price: number }[] }

/**
 * The admin offer form prefilled from a request ("Angebot erstellen"): customer, language,
 * date, time window (or time text), place, and either the chosen shop product (first size)
 * or a free item carrying the customer's message. Topics, budget and the rest go into the
 * internal note. Nothing here is sent to the customer before the team edits and sends it.
 */
export function customRequestToOfferForm(req: CustomRequest, base: OfferFormState, ctx: { products: PrefillProduct[]; locales: readonly string[] }): OfferFormState {
  const { firstName, lastName } = splitName(req.name);
  const window = parseTimeWindow(req.time);
  const place = parsePlace(req.place);
  const product = req.product ? ctx.products.find((p) => p.slug === req.product?.slug) : undefined;
  const size = product?.sizes[0];

  const item = product && size
    ? { ...emptyItem("product"), productId: product.id, sizeId: size.id, title: product.name, unitPrice: String(size.price) }
    : { ...emptyItem("custom"), description: cut(req.message, 1000) };

  const notes = [
    `Aus Anfrage ${req.id}`,
    req.topics.length ? `Themen: ${req.topics.map((t) => TOPIC_LABELS[t as CustomRequestTopic] ?? t).join(", ")}` : "",
    req.budget ? `Budget: ${BUDGET_LABELS[req.budget as CustomRequestBudget] ?? req.budget}` : "",
    req.flexible ? "Termin flexibel" : "",
    req.time && window ? `Uhrzeit laut Anfrage: ${req.time}` : "",
    req.place ? `Lieferort laut Anfrage: ${req.place}` : "",
    product ? `Nachricht: ${req.message}` : "",
  ].filter(Boolean);

  return {
    ...base,
    locale: ctx.locales.includes(req.locale) ? req.locale : "de",
    customer: { firstName, lastName, email: req.email, phone: req.phone ?? "" },
    items: [item],
    delivery: {
      ...base.delivery,
      date: req.date ?? "",
      from: window?.from ?? "",
      to: window?.to ?? "",
      text: window ? "" : cut(req.time ?? "", 120),
    },
    recipient: { ...base.recipient, ...place, firstName, lastName, phone: req.phone ?? "" },
    internalNote: cut(notes.join("\n"), 1000),
  };
}

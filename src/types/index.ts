import type { FoundVia } from "@/lib/found-via";
/**
 * Blumora – shared domain types.
 * Everything that an administrator can edit lives in `content/*.json`
 * and is typed here. Keep this file the single source of truth.
 */

export type ISODate = string; // "YYYY-MM-DD"
export type TimeHHMM = string; // "13:00"

export type SizeId = "s" | "m" | "l" | "xl" | "xxl" | "xxxl";

export interface ProductSize {
  id: SizeId;
  label: string; // "Klein" | "Mittel" | "Groß" | "XL" | "60 cm" …
  price: number; // EUR, gross
  compareAtPrice?: number;
  stems?: number;
  description?: string; // "ca. 15 Stiele"
  popular?: boolean;
  image?: string; // optional size-specific image path
  detailImage?: string; // optional second photo of this size (close-up or lifestyle), shown second in the gallery
  detailAlt?: string; // its description; without it the second photo counts as a close-up
  stock?: number; // undefined = unlimited
}

export interface ProductColorOption {
  id: string;
  label: string; // "Rot", "Bunter Mix"
  image?: string; // photo of this colour
}

export interface ProductImage {
  src: string;
  alt: string;
  kind: "front" | "detail" | "size" | "packaging" | "lifestyle";
}

export type BadgeKind = "bestseller" | "new" | "seasonal" | "sameday";

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string; // short flower description under the name
  shortDescription: string;
  description: string;
  flowers: string[]; // "Garten-Rosen", "Eukalyptus"
  care: string[];
  images: ProductImage[];
  category: string; // category slug
  occasions: string[]; // occasion slugs
  colors: string[]; // color slugs
  styles: string[]; // style slugs
  seasons: string[]; // "fruehling" | "sommer" | "herbst" | "winter" | "ganzjaehrig"
  tags: string[];
  sizes: ProductSize[];
  /** Colours the customer must choose from (e.g. tulips, Advent wreaths). Missing/empty = no choice. */
  colorOptions?: ProductColorOption[];
  basePrice: number; // = lowest size price (denormalised for sorting)
  /** Prices not fixed yet: the shop shows "Preis folgt" and refuses orders for it. */
  pricePending?: boolean;
  stock: number | null; // null = unlimited
  deliverable: boolean;
  bestseller: boolean;
  isNew: boolean;
  sameDayCapable: boolean;
  active: boolean;
  rating?: { value: number; count: number };
  seo: { title: string; description: string };
  sortOrder?: number;
}

export interface Occasion {
  slug: string;
  name: string;
  headline: string;
  intro: string;
  image: string;
  imageAlt: string;
  seo: { title: string; description: string };
  featured: boolean;
  sortOrder: number;
}

export interface Category {
  slug: string;
  name: string;
  headline: string;
  intro: string;
  image?: string;
  /** Optional rule based membership. Products may also reference categories directly. */
  rule?: {
    maxPrice?: number;
    colors?: string[];
    styles?: string[];
    tags?: string[];
    bestseller?: boolean;
    isNew?: boolean;
    categorySlugs?: string[];
  };
  seo: { title: string; description: string };
  showInNav: boolean;
  sortOrder: number;
}

export interface Extra {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  image: string;
  imageAlt: string;
  active: boolean;
  showInCart: boolean;
  sortOrder: number;
}

export interface DeliveryWindow {
  id: string;
  label: string; // "9–13 Uhr"
  from: TimeHHMM;
  to: TimeHHMM;
  surcharge: number;
  active: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  region: string; // "Wien" | "Niederösterreich"
  /** Postal codes or inclusive ranges, e.g. "1010-1090", "2340" */
  postalCodes: string[];
  fee: number;
  freeFrom: number | null; // free delivery from this subtotal
  minOrder: number;
  /** 0 = Sunday … 6 = Saturday */
  deliveryDays: number[];
  /** Orders placed until this time are delivered on the next possible day. */
  cutoff: TimeHHMM;
  /** Minimum lead in days (0 = same-day possible if sameDay is true). */
  leadDays: number;
  sameDay: boolean;
  sameDayCutoff: TimeHHMM;
  /** Optional earlier same-day cutoff on Sundays (e.g. "17:45"); empty = sameDayCutoff. */
  sameDayCutoffSunday?: TimeHHMM;
  windows: DeliveryWindow[];
  active: boolean;
  note?: string;
}

export interface Coupon {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minOrder: number;
  active: boolean;
  validFrom?: ISODate;
  validUntil?: ISODate;
  description?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  sortOrder: number;
}

export interface Review {
  id: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  productSlug?: string;
  verified: boolean;
  date: ISODate;
  /** Demo reviews are shown with a clear label until real reviews exist. */
  demo: boolean;
  /** Customer photos accepted by an admin (only shown for real, verified reviews). */
  photos?: ReviewPhoto[];
  /** One short customer video (max. 15 s) accepted by an admin; only shown for real, verified reviews. */
  video?: ReviewVideo;
  /** Language the review was written in (shop locale, e.g. "tr"). Missing = German. */
  lang?: string;
  /** Translations entered in the admin, per shop locale (the original language needs none). */
  translations?: Partial<Record<string, string>>;
  /**
   * Set by the storefront when `text` is shown in another language than written:
   * `translated` = `text` is a translation of `original`; otherwise `text` is the original.
   */
  display?: { lang: string; translated: boolean; original: string };
}

export interface ReviewPhoto {
  src: string;
  /** e.g. "Kundenfoto zu Red Passion" */
  alt: string;
}

export interface ReviewVideo {
  /** `/media/review-videos/<id>/video.<mp4|mov|webm>` – served with HTTP Range support. */
  src: string;
  /** Poster frame (JPEG, generated in the browser, re-encoded on the server). */
  poster: string;
  /** e.g. "Kundenvideo zu Red Passion" */
  alt: string;
  /** Length in seconds as measured by the customer's browser. */
  duration?: number;
  width?: number;
  height?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  stems: string;
  popular?: boolean;
}

export interface SubscriptionConfig {
  enabled: boolean;
  headline: string;
  intro: string;
  plans: SubscriptionPlan[];
  frequencies: { id: string; label: string; discount: number }[];
  audiences: string[];
  image: string;
}

export interface OrderStatusDefinition {
  key: OrderStatus;
  label: string;
  description: string;
  customerVisible: boolean;
  terminal: boolean;
}

export type OrderStatus =
  | "received"
  | "paid"
  | "preparing"
  | "arranging"
  | "ready"
  | "in_transit"
  | "delivered"
  | "undeliverable"
  | "cancelled";

export interface PaymentMethodConfig {
  id: "apple_pay" | "google_pay" | "card" | "paypal" | "klarna" | "eps";
  label: string;
  enabled: boolean;
  provider?: "stripe" | "paypal" | "klarna" | "mock";
}

export interface SiteSettings {
  brand: {
    name: string;
    claim: string;
    legalName: string; // placeholder until provided
    email: string;
    phone: string;
    address: { street: string; zip: string; city: string; country: string };
    openingHours: string[];
    /** Profile and chat links (full URLs). Empty or missing = the link is hidden everywhere. */
    social: { whatsapp?: string; instagram?: string; x?: string; linkedin?: string; facebook?: string; pinterest?: string; tiktok?: string };
  };
  /** The WhatsApp chat is answered around the clock – only then does the shop say "24/7" / "rund um die Uhr". */
  whatsappSupport247?: boolean;
  announcement: {
    enabled: boolean;
    messages: string[];
  };
  timezone: string;
  currency: "EUR";
  blackoutDates: ISODate[];
  sameDayEnabled: boolean;
  /** Weekdays (0 = Sunday) on which the team delivers itself – no rider is booked automatically. Empty/missing = always the courier. */
  selfDeliveryDays?: number[];
  subscriptionEnabled: boolean;
  newsletterEnabled: boolean;
  favoritesEnabled: boolean;
  headerCta: { enabled: boolean; label: string; href: string };
  payments: PaymentMethodConfig[];
  orderStatuses: OrderStatusDefinition[];
  seo: {
    siteUrl: string;
    defaultTitle: string;
    defaultDescription: string;
  };
  trust: { icon: string; title: string; text: string }[];
  /**
   * `enabled` switches greeting cards on. Missing counts as off: settings stored
   * before the switch existed keep cards disabled until someone turns them on.
   */
  greetingCard: { enabled?: boolean; maxChars: number; freeCardIncluded: boolean };
}

/* ---------------- Homepage & CMS pages ---------------- */

export interface HomepageContent {
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    imageWide: string;
    imagePortrait: string;
    imageAlt: string;
    /** Optional looping background video (MP4, 16:9, muted). The images stay as poster and reduced-motion fallback. */
    video?: string;
    deliveryCheck: { title: string; placeholder: string; button: string };
  };
  occasions: { headline: string; subheadline: string; slugs: string[] };
  bestsellers: { headline: string; subheadline: string; productSlugs: string[] };
  collections: { headline: string; subheadline: string; slugs: string[] };
  howItWorks: { headline: string; steps: { title: string; text: string; icon: string }[] };
  seasonal: {
    eyebrow: string;
    headline: string;
    text: string;
    cta: { label: string; href: string };
    image: string;
    imageAlt: string;
    productSlugs: string[];
  };
  editorial: {
    eyebrow: string;
    headline: string;
    text: string;
    cta: { label: string; href: string };
    image: string;
    imageAlt: string;
  };
  extras: { headline: string; subheadline: string };
  subscription: { headline: string; text: string; cta: { label: string; href: string } };
  reviews: { headline: string; subheadline: string };
  gallery: { headline: string; images: { src: string; alt: string }[] };
  faq: { headline: string; ids: string[] };
  newsletter: { headline: string; text: string; placeholder: string; button: string; note: string };
}

export interface RichSection {
  heading?: string;
  paragraphs: string[];
  image?: { src: string; alt: string };
  placeholder?: boolean; // true = clearly marked "needs real content"
}

export interface CmsPage {
  slug: string;
  title: string;
  intro?: string;
  sections: RichSection[];
  seo: { title: string; description: string };
  placeholder?: boolean;
}

export interface LandingPage {
  slug: string; // "blumenversand-wien"
  /** Language of the page (missing = German). Other languages are served under /{locale}/{slug}. */
  locale?: string;
  title: string;
  headline: string;
  intro: string;
  image?: string;
  productFilter: {
    occasions?: string[];
    category?: string;
    /** Colour slugs – a product matches when it has at least one of them. */
    colors?: string[];
    /** Season slugs – a product matches when it has at least one of them (e.g. "herbst", "ganzjaehrig"). */
    seasons?: string[];
    sameDayOnly?: boolean;
    limit?: number;
  };
  sections: RichSection[];
  faqIds: string[];
  seo: { title: string; description: string };
}

/* ---------------- Cart & Orders ---------------- */

export interface CartExtra {
  extraId: string;
  quantity: number;
  /** Display snapshot – prices are re-validated server-side when the order is created. */
  name: string;
  price: number;
  image: string;
}

export interface CartItem {
  id: string; // client generated
  productId: string;
  sizeId: SizeId;
  quantity: number;
  deliveryDate?: ISODate;
  postalCode?: string;
  windowId?: string;
  message?: string;
  anonymous?: boolean;
  senderName?: string;
  /** Chosen colour (ProductColorOption.id), required when the product offers colours. */
  colorId?: string;
  /** Wish to the florist ("eine Farbe tauschen …") – depends on availability. */
  floristNote?: string;
  extras: CartExtra[];
  /** Display snapshot – prices are re-validated server-side when the order is created. */
  snapshot: {
    slug: string;
    name: string;
    tagline: string;
    image: string;
    sizeLabel: string;
    colorLabel?: string;
    unitPrice: number;
    sameDayCapable: boolean;
  };
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  houseNumber: string;
  addition?: string; // Stiege/Tür
  zip: string;
  city: string;
  country: "AT";
  phone: string;
}

export interface OrderLine {
  productId: string;
  productName: string;
  sizeId: SizeId;
  sizeLabel: string;
  /** Number of stems of the chosen size (rose bouquets: roses), snapshot at order time. */
  stems?: number;
  /** Chosen colour, e.g. "Rot". */
  color?: string;
  /** Customer's wish to the florist. */
  floristNote?: string;
  quantity: number;
  unitPrice: number;
  image: string;
  extras: { extraId: string; name: string; quantity: number; unitPrice: number; image?: string; floristBudget?: number }[];
  /** Net purchase budget of the partner florist per unit, snapshot at order time. Internal – stripped from every public view. */
  floristBudget?: number;
  message?: string;
  anonymous?: boolean;
  senderName?: string;
  /** Line of an individual offer (no shop product behind it): `productId` is "custom", size fields are placeholders. */
  custom?: boolean;
  /** What the florist binds for a custom line (from the offer), e.g. "Strauß nur aus rosa Tulpen". */
  description?: string;
}

export interface OrderCourier {
  provider: "riderx";
  /** "booking" while the request runs, then RiderX's status ("created", "accepted", "pickup", "completed", "cancel" …) or "failed". */
  status: string;
  deliveryId?: number;
  /** Planned pickup (ISO with offset). */
  pickupAt?: string;
  bookedAt?: string;
  updatedAt: string;
  error?: string;
}

export interface Order {
  id: string; // BQ-XXXXXX
  token: string; // tracking token
  createdAt: string; // ISO datetime
  status: OrderStatus;
  history: { status: OrderStatus; at: string; note?: string }[];
  recipient: Address;
  delivery: {
    date: ISODate;
    windowId?: string;
    windowLabel?: string;
    /** Window times ("HH:MM") at order time – the courier pickup is planned from them. */
    windowFrom?: string;
    windowTo?: string;
    note?: string;
    zoneId: string;
    zoneName: string;
    fee: number;
    /** No delivery at all (individual offer: pickup or as agreed) – mails show "Nach Absprache". */
    none?: boolean;
  };
  customer: { firstName: string; lastName: string; email: string; phone: string };
  lines: OrderLine[];
  coupon?: { code: string; discount: number };
  totals: { subtotal: number; extras: number; delivery: number; discount: number; total: number };
  payment: {
    method: PaymentMethodConfig["id"];
    status: "pending" | "paid" | "failed" | "refunded";
    reference?: string;
    /** Which provider handled the payment (mock, stripe, paypal …). */
    provider?: string;
    /** Provider-side id (Stripe PaymentIntent, PayPal order id …). */
    intentId?: string;
    paidAt?: string;
  };
  internalNote?: string;
  /** Courier booking (RiderX), set once the order is paid and a rider was booked. */
  courier?: OrderCourier;
  /** Optional link to a customer account (e-mail based). */
  customerId?: string;
  /** Partner florist this order is assigned to (chosen in the admin). Without it nobody gets the order slip. */
  partner?: OrderPartner;
  /** Answer to "Wie hast du uns gefunden?" (review mail / review page). */
  foundVia?: FoundVia;
  /** Shop language the order was placed in (`Locale`, e.g. "en"); customer mails use it. Missing = German. */
  locale?: string;
  /** Individual offer this order was created from (admin → Angebote). */
  offerId?: string;
  /** Team note to the florist from the offer – prefilled as partner note when the order is assigned. */
  floristNote?: string;
  /** Invoice address, when the customer asked for one (offers). */
  billing?: BillingAddress;
}

export interface BillingAddress {
  company?: string;
  name?: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  /** UID / VAT ID. */
  vatId?: string;
}

/* ---------------- Individual offers (admin → Angebote) ---------------- */

/** Stored status; "viewed" and "expired" are derived (see `offerStatus` in src/lib/offers-core.ts). */
export type OfferStoredStatus = "draft" | "sent" | "paid" | "cancelled";
export type OfferStatus = OfferStoredStatus | "viewed" | "expired";

export interface OfferItem {
  id: string;
  /** "custom" = free text item; "product" = a shop product + size (price editable). */
  kind: "custom" | "product";
  title: string;
  description?: string;
  image?: string;
  productId?: string;
  sizeId?: SizeId;
  sizeLabel?: string;
  quantity: number;
  /** Final price per unit (EUR). */
  unitPrice: number;
  /** Optional purchase budget for the partner florist per unit (internal). */
  floristBudget?: number;
}

export interface OfferExtra {
  extraId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

export interface Offer {
  id: string; // AN-XXXXXX
  /** Unguessable secret of the public offer link. */
  token: string;
  createdAt: string;
  updatedAt: string;
  status: OfferStoredStatus;
  /** Language of the offer mail and page (`Locale`). */
  locale: string;
  customer: { firstName: string; lastName: string; email: string; phone?: string };
  items: OfferItem[];
  extras: OfferExtra[];
  delivery: {
    /** false = no delivery (pickup or anything else agreed) – date, time and place are optional then. */
    enabled: boolean;
    /** Any date (no delivery-day rules); "" when not set. */
    date: ISODate;
    /** Optional window "HH:MM"–"HH:MM" ("" when not set). */
    from: string;
    to: string;
    /** Free time text instead of / in addition to the window, e.g. "nach Absprache, ca. 15 Uhr". */
    text?: string;
    /** Manual amount (prefilled from the zone of the ZIP in the admin). */
    fee: number;
    zoneId?: string;
    zoneName?: string;
    note?: string;
  };
  recipient: {
    /** "meeting" = a meeting point (e.g. "Haupteingang Burgtheater"), described in `addition`. */
    kind: "address" | "meeting";
    firstName: string;
    lastName: string;
    company?: string;
    phone: string;
    street: string;
    houseNumber: string;
    addition?: string;
    zip: string;
    city: string;
  };
  greeting?: { message: string; senderName?: string };
  floristNote?: string;
  billing?: BillingAddress;
  internalNote?: string;
  /** Last day the offer can be paid (Vienna time, inclusive). */
  validUntil: ISODate;
  sentAt?: string;
  sentCount?: number;
  viewedAt?: string;
  /** Order of the current/last payment attempt. */
  orderId?: string;
  paidAt?: string;
  cancelledAt?: string;
  history: { at: string; note: string }[];
}

/* ---------------- Partner florists ---------------- */

/** A partner florist (content document `partners`, edited in the admin). */
export interface Partner {
  id: string;
  name: string;
  /** Addresses that receive order slips and cancellations. */
  emails: string[];
  /** While `emails` is empty, use the addresses from MAIL_FLORIST (env) instead. */
  useEnvMail?: boolean;
  contactName?: string;
  phone?: string;
  address?: string;
  note?: string;
  /** Opening hours (local time, "HH:MM") – reminders only count open minutes. */
  openFrom?: string;
  openTo?: string;
  /** Open weekdays (0 = Sunday). Empty/missing = every day. */
  openDays?: number[];
  active: boolean;
  sortOrder: number;
}

/** The partner an order is assigned to, and what they were sent. */
export interface OrderPartner {
  /** Note from the team to the florist – shown big and bold at the top of the order slip. */
  note?: string;
  id: string;
  name: string;
  assignedAt: string;
  /** When the order slip went out (and to whom). */
  sentAt?: string;
  sentTo?: string[];
  /** When the cancellation went out to this partner. */
  cancelSentAt?: string;
  /** Secret for the "Auftrag bestätigen" link in the order slip (new per slip). */
  confirmToken?: string;
  /** When the partner confirmed the order slip. */
  confirmedAt?: string;
  /** Reminder mails sent for this slip (ISO times), see partner-reminders.ts. */
  reminders?: string[];
  /**
   * Assigned afterwards in the partner billing ("Aufträge ohne Partner zuordnen") –
   * no order slip, no mail, no courier booking. See docs/PARTNER-PORTAL.md.
   */
  manual?: boolean;
}

/* ---------------- Newsletter ---------------- */

/**
 * One newsletter address (runtime document `newsletter`). Only `confirmed` entries may
 * receive newsletters (double opt-in). Entries without `status` were collected before
 * the double opt-in existed and count as not confirmed.
 */
export interface NewsletterSubscriber {
  id?: string;
  email: string;
  createdAt: string;
  status?: "pending" | "confirmed";
  /** Random token for the confirmation and unsubscribe links. */
  token?: string;
  /** Last time a confirmation mail was sent (resend throttle). */
  requestedAt?: string;
  confirmedAt?: string;
  /** Where the sign-up came from: "website" or "checkout". */
  source?: string;
  /** Order in whose checkout the customer ticked the box (consent record). */
  orderId?: string;
  /** Language of the sign-up (`Locale`) – the confirmation mail uses it. Missing = German. */
  locale?: string;
}

/**
 * "Abgebrochene Kasse": a snapshot of a checkout that has not (yet) become an order –
 * stored when the customer reaches the payment step (contact data known) or closes the
 * Express-Kauf wallet sheet. Runtime data (`data/checkout-drafts.json` or Postgres),
 * deleted when an order is created from the same session and after 30 days.
 * See docs/PAYMENTS.md → „Abgebrochene Kasse“.
 */
export interface CheckoutDraft {
  /** Random id generated in the browser (kept in sessionStorage). */
  id: string;
  source: "checkout" | "express";
  createdAt: string;
  updatedAt: string;
  /** Checkout step the snapshot was taken at (4 = contact data done, 5 = payment step). */
  step?: number;
  locale?: string;
  contact?: { firstName: string; lastName: string; email: string; phone: string };
  recipient?: { firstName: string; lastName: string; company?: string; street: string; houseNumber: string; addition?: string; zip: string; city: string; phone: string };
  delivery?: { date: string; windowId?: string; windowLabel?: string };
  /** Cart lines as resolved from the catalog at snapshot time. */
  lines: { productId: string; name: string; sizeLabel?: string; color?: string; quantity: number; unitPrice?: number; extras?: { name: string; quantity: number }[] }[];
  couponCode?: string;
  /** Server-side estimate (EUR): the full total incl. delivery when zone and day are known, else goods only. */
  totalEstimate?: number;
  /** True when `totalEstimate` includes delivery and coupon. */
  totalComplete?: boolean;
  /** Express-Kauf: what the wallet revealed before payment (Apple/Google release name, e-mail and phone only on payment). */
  express?: { wallet?: string; postalCode?: string; city?: string; country?: string };
}

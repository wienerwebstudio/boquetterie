/**
 * Boquetterie – shared domain types.
 * Everything that an administrator can edit lives in `content/*.json`
 * and is typed here. Keep this file the single source of truth.
 */

export type ISODate = string; // "YYYY-MM-DD"
export type TimeHHMM = string; // "13:00"

export type SizeId = "s" | "m" | "l";

export interface ProductSize {
  id: SizeId;
  label: string; // "Small" | "Medium" | "Large"
  price: number; // EUR, gross
  compareAtPrice?: number;
  stems?: number;
  description?: string; // "ca. 15 Stiele"
  popular?: boolean;
  image?: string; // optional size-specific image path
  stock?: number; // undefined = unlimited
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
  basePrice: number; // = lowest size price (denormalised for sorting)
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
    social: { instagram?: string; facebook?: string; pinterest?: string; tiktok?: string };
  };
  announcement: {
    enabled: boolean;
    messages: string[];
  };
  timezone: string;
  currency: "EUR";
  blackoutDates: ISODate[];
  sameDayEnabled: boolean;
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
  greetingCard: { maxChars: number; freeCardIncluded: boolean };
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
  title: string;
  headline: string;
  intro: string;
  image?: string;
  productFilter: {
    occasions?: string[];
    category?: string;
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
  extras: CartExtra[];
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
  quantity: number;
  unitPrice: number;
  image: string;
  extras: { extraId: string; name: string; quantity: number; unitPrice: number }[];
  message?: string;
  anonymous?: boolean;
  senderName?: string;
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
    note?: string;
    zoneId: string;
    zoneName: string;
    fee: number;
  };
  customer: { firstName: string; lastName: string; email: string; phone: string };
  lines: OrderLine[];
  coupon?: { code: string; discount: number };
  totals: { subtotal: number; extras: number; delivery: number; discount: number; total: number };
  payment: { method: PaymentMethodConfig["id"]; status: "pending" | "paid" | "failed"; reference?: string };
  internalNote?: string;
}

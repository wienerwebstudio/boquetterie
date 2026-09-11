/**
 * Shared fixtures for the unit suite. Real admin content (zones, products,
 * categories, occasions) is loaded from `content/` so the tests exercise the
 * same data the shop ships with; synthetic objects are built via the factories.
 */
import type { CartItem, Category, Coupon, DeliveryZone, Occasion, Product, SiteSettings } from "@/types";
import type { LocalNow } from "@/lib/delivery";
import zonesJson from "../../content/delivery-zones.json";
import productsJson from "../../content/products.json";
import categoriesJson from "../../content/categories.json";
import occasionsJson from "../../content/occasions.json";

export const zones = zonesJson as DeliveryZone[];
export const products = productsJson as Product[];
export const categories = categoriesJson as Category[];
export const occasions = occasionsJson as Occasion[];

export const zoneById = (id: string) => {
  const z = zones.find((x) => x.id === id);
  if (!z) throw new Error(`fixture zone ${id} missing`);
  return z;
};
export const productBySlug = (slug: string) => {
  const p = products.find((x) => x.slug === slug);
  if (!p) throw new Error(`fixture product ${slug} missing`);
  return p;
};
export const categoryBySlug = (slug: string) => {
  const c = categories.find((x) => x.slug === slug);
  if (!c) throw new Error(`fixture category ${slug} missing`);
  return c;
};

/** Zones used by most delivery tests. */
export const wienZentrum = zoneById("wien-zentrum"); // same-day until 12:00, cutoff 14:00, Mo–Sa
export const wienAussen = zoneById("wien-aussen"); // no same-day
export const noeUmland = zoneById("noe-umland"); // Tue/Thu/Sat only, min order 39, no free delivery

export const settings: Pick<SiteSettings, "blackoutDates" | "sameDayEnabled" | "timezone"> = {
  blackoutDates: [],
  sameDayEnabled: true,
  timezone: "Europe/Vienna",
};

/* Fixed points in time (shop-local). 2026-09-10 is a Thursday. */
export const THU = "2026-09-10";
export const FRI = "2026-09-11";
export const SAT = "2026-09-12";
export const SUN = "2026-09-13";
export const MON = "2026-09-14";
export const TUE = "2026-09-15";

export function at(date: string, hhmm: string): LocalNow {
  const [h, m] = hhmm.split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  return { date, minutes: h * 60 + m, weekday: new Date(Date.UTC(y, mo - 1, d, 12)).getUTCDay() };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    ...productBySlug("amour"),
    id: "p-test",
    slug: "test",
    name: "Test",
    ...overrides,
  };
}

export function makeItem(overrides: Partial<CartItem> & { unitPrice?: number } = {}): CartItem {
  const { unitPrice = 44.9, ...rest } = overrides;
  return {
    id: "item-1",
    productId: "p-amour",
    sizeId: "s",
    quantity: 1,
    extras: [],
    snapshot: { slug: "amour", name: "Amour", tagline: "Rote Gartenrosen", image: "/x.jpg", sizeLabel: "Small", unitPrice, sameDayCapable: true },
    ...rest,
  };
}

export function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return { code: "TEST", type: "percent", value: 10, minOrder: 0, active: true, ...overrides };
}

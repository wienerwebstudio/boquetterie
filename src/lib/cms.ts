import "server-only";
import { getStore, jsonStore } from "@/lib/store";
import type {
  Category, CmsPage, Coupon, DeliveryZone, Extra, FAQ, HomepageContent, LandingPage,
  Occasion, Product, Review, SiteSettings, SubscriptionConfig, Order,
} from "@/types";

/**
 * Content repository.
 *
 * All editable content lives as JSON documents in `/content` (versioned) and
 * transactional data in `/data` (not versioned). This module is the ONLY place
 * pages, components and actions read or write persisted data. The physical
 * storage is a `DocumentStore` (`src/lib/store`): JSON files by default, or
 * Postgres when `DATABASE_URL` is set – see docs/DATABASE.md.
 */
type Collection =
  | "products" | "occasions" | "categories" | "extras" | "delivery-zones" | "coupons"
  | "faqs" | "reviews" | "subscription" | "settings" | "homepage" | "pages" | "landing-pages";

/**
 * Reads an editorial document. With the Postgres store a document that is not yet
 * in the database (fresh deployment) is served from `/content/<name>.json` and
 * seeded into the database on first read, so no manual import is required.
 */
async function readContent<T>(name: string): Promise<T> {
  const store = getStore();
  const value = await store.get<T>("content", name);
  if (value !== null) return value;

  if (store.name !== "json") {
    const seed = await jsonStore.get<T>("content", name);
    if (seed !== null) {
      await store.set("content", name, seed).catch((err: unknown) => {
        console.warn(`[bloomery] could not seed content "${name}" into ${store.name}:`, err);
      });
      return seed;
    }
  }
  throw new Error(`Content document "${name}" not found`);
}

/** Reads a runtime document; `fallback` when it does not exist yet. Storage errors propagate. */
async function readDataDoc<T>(name: string, fallback: T): Promise<T> {
  const value = await getStore().get<T>("data", name);
  return value === null ? fallback : value;
}

export async function readCollection<T>(name: Collection): Promise<T> {
  return readContent<T>(name);
}
export async function writeCollection(name: Collection, value: unknown) {
  return getStore().set("content", name, value);
}

/* ---------------- Typed accessors ---------------- */

export const getSettings = () => readCollection<SiteSettings>("settings");
export const getHomepage = () => readCollection<HomepageContent>("homepage");
export const getSubscription = () => readCollection<SubscriptionConfig>("subscription");
export const getOccasions = async () =>
  (await readCollection<Occasion[]>("occasions")).sort((a, b) => a.sortOrder - b.sortOrder);
export const getCategories = async () =>
  (await readCollection<Category[]>("categories")).sort((a, b) => a.sortOrder - b.sortOrder);
export const getExtras = async (onlyActive = true) =>
  (await readCollection<Extra[]>("extras"))
    .filter((e) => !onlyActive || e.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
export const getDeliveryZones = async (onlyActive = true) =>
  (await readCollection<DeliveryZone[]>("delivery-zones")).filter((z) => !onlyActive || z.active);
export const getCoupons = () => readCollection<Coupon[]>("coupons");
export const getFaqs = async () =>
  (await readCollection<FAQ[]>("faqs")).sort((a, b) => a.sortOrder - b.sortOrder);
export const getReviews = () => readCollection<Review[]>("reviews");
export const getPages = () => readCollection<CmsPage[]>("pages");
export const getLandingPages = () => readCollection<LandingPage[]>("landing-pages");

export async function getAllProducts(includeInactive = false): Promise<Product[]> {
  const products = await readCollection<Product[]>("products");
  return products
    .filter((p) => includeInactive || p.active)
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
}
export async function getProductBySlug(slug: string) {
  return (await getAllProducts()).find((p) => p.slug === slug) ?? null;
}
export async function getProductsBySlugs(slugs: string[]) {
  const all = await getAllProducts();
  return slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p));
}
export async function getOccasionBySlug(slug: string) {
  return (await getOccasions()).find((o) => o.slug === slug) ?? null;
}
export async function getCategoryBySlug(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}
export async function getPageBySlug(slug: string) {
  return (await getPages()).find((p) => p.slug === slug) ?? null;
}
export async function getLandingPageBySlug(slug: string) {
  return (await getLandingPages()).find((p) => p.slug === slug) ?? null;
}
export async function getFaqsByIds(ids: string[]) {
  const all = await getFaqs();
  return ids.map((id) => all.find((f) => f.id === id)).filter((f): f is FAQ => Boolean(f));
}

/* ---------------- Orders & newsletter (runtime data) ---------------- */

export async function getOrders(): Promise<Order[]> {
  return readDataDoc<Order[]>("orders", []);
}
export async function saveOrders(orders: Order[]) {
  return getStore().set("data", "orders", orders);
}
export async function getOrderById(id: string) {
  return (await getOrders()).find((o) => o.id === id) ?? null;
}
export async function addOrder(order: Order) {
  const orders = await getOrders();
  orders.unshift(order);
  await saveOrders(orders);
  return order;
}
export async function updateOrder(id: string, patch: (o: Order) => Order) {
  const orders = await getOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  orders[idx] = patch(orders[idx]);
  await saveOrders(orders);
  return orders[idx];
}

export async function getNewsletterSubscribers(): Promise<{ email: string; createdAt: string }[]> {
  return readDataDoc<{ email: string; createdAt: string }[]>("newsletter", []);
}
export async function addNewsletterSubscriber(email: string) {
  const list = await getNewsletterSubscribers();
  if (!list.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
    list.push({ email, createdAt: new Date().toISOString() });
    await getStore().set("data", "newsletter", list);
  }
}

/* ---------------- Generic runtime data (reminders, sessions, requests …) ---------------- */

/**
 * Small JSON documents that are NOT editorial content: reminders, auth tokens,
 * business inquiries, contact messages … Stored under `/data` (git-ignored).
 * Callers must treat the value as opaque and write back the whole document.
 */
export async function readData<T>(name: string, fallback: T): Promise<T> {
  return readDataDoc<T>(name, fallback);
}
export async function writeData(name: string, value: unknown) {
  return getStore().set("data", name, value);
}

export async function getOrdersByEmail(email: string) {
  const needle = email.trim().toLowerCase();
  return (await getOrders()).filter((o) => o.customer.email.toLowerCase() === needle);
}

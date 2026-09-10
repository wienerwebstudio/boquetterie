import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  Category, CmsPage, Coupon, DeliveryZone, Extra, FAQ, HomepageContent, LandingPage,
  Occasion, Product, Review, SiteSettings, SubscriptionConfig, Order,
} from "@/types";

/**
 * Content repository.
 *
 * All editable content lives as JSON in `/content` (versioned) and transactional
 * data in `/data` (not versioned). This module is the ONLY place that touches the
 * file system, so the storage can later be swapped for a database without touching
 * pages or components.
 */
const CONTENT_DIR = path.join(process.cwd(), "content");
const DATA_DIR = path.join(process.cwd(), "data");

type Collection =
  | "products" | "occasions" | "categories" | "extras" | "delivery-zones" | "coupons"
  | "faqs" | "reviews" | "subscription" | "settings" | "homepage" | "pages" | "landing-pages";

const cache = new Map<string, { mtimeMs: number; value: unknown }>();

async function readJson<T>(dir: string, name: string): Promise<T> {
  const file = path.join(dir, `${name}.json`);
  const stat = await fs.stat(file);
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.value as T;
  const raw = await fs.readFile(file, "utf8");
  const value = JSON.parse(raw) as T;
  cache.set(file, { mtimeMs: stat.mtimeMs, value });
  return value;
}

async function writeJson(dir: string, name: string, value: unknown) {
  const file = path.join(dir, `${name}.json`);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
  cache.delete(file);
}

export async function readCollection<T>(name: Collection): Promise<T> {
  return readJson<T>(CONTENT_DIR, name);
}
export async function writeCollection(name: Collection, value: unknown) {
  return writeJson(CONTENT_DIR, name, value);
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
  try {
    return await readJson<Order[]>(DATA_DIR, "orders");
  } catch {
    return [];
  }
}
export async function saveOrders(orders: Order[]) {
  return writeJson(DATA_DIR, "orders", orders);
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
  try {
    return await readJson(DATA_DIR, "newsletter");
  } catch {
    return [];
  }
}
export async function addNewsletterSubscriber(email: string) {
  const list = await getNewsletterSubscribers();
  if (!list.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
    list.push({ email, createdAt: new Date().toISOString() });
    await writeJson(DATA_DIR, "newsletter", list);
  }
}

/* ---------------- Generic runtime data (reminders, sessions, requests …) ---------------- */

/**
 * Small JSON documents that are NOT editorial content: reminders, auth tokens,
 * business inquiries, contact messages … Stored under `/data` (git-ignored).
 * Callers must treat the value as opaque and write back the whole document.
 */
export async function readData<T>(name: string, fallback: T): Promise<T> {
  try {
    return await readJson<T>(DATA_DIR, name);
  } catch {
    return fallback;
  }
}
export async function writeData(name: string, value: unknown) {
  return writeJson(DATA_DIR, name, value);
}

export async function getOrdersByEmail(email: string) {
  const needle = email.trim().toLowerCase();
  return (await getOrders()).filter((o) => o.customer.email.toLowerCase() === needle);
}

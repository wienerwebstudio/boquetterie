/**
 * Cart helpers – build cart items from a product configuration.
 * Pure & isomorphic; the display snapshot is re-validated server-side on order creation.
 */
import type { CartExtra, CartItem, Extra, ISODate, Product, ProductSize, SizeId } from "@/types";
import { primaryImage } from "@/lib/catalog";

export function makeCartSnapshot(product: Product, size: ProductSize): CartItem["snapshot"] {
  return {
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    image: size.image ?? primaryImage(product).src,
    sizeLabel: size.label,
    unitPrice: size.price,
    sameDayCapable: product.sameDayCapable,
  };
}

export function extraToCartExtra(extra: Extra, quantity = 1): CartExtra {
  return {
    extraId: extra.id,
    quantity,
    name: extra.name,
    price: extra.price,
    image: extra.image,
  };
}

export interface CartItemConfig {
  product: Product;
  size: ProductSize;
  quantity?: number;
  deliveryDate?: ISODate | null;
  postalCode?: string | null;
  windowId?: string | null;
  message?: string;
  anonymous?: boolean;
  senderName?: string;
  /** Extras with their chosen quantity. Entries with quantity <= 0 are dropped. */
  extras?: { extra: Extra; quantity: number }[];
}

/** Builds the payload for `useCart().addItem`. Empty optional fields are omitted. */
export function cartItemFromConfig(cfg: CartItemConfig): Omit<CartItem, "id"> {
  const message = cfg.message?.trim();
  const senderName = cfg.senderName?.trim();
  const extras = (cfg.extras ?? [])
    .filter((e) => e.quantity > 0)
    .map((e) => extraToCartExtra(e.extra, e.quantity));
  return {
    productId: cfg.product.id,
    sizeId: cfg.size.id,
    quantity: Math.max(1, cfg.quantity ?? 1),
    ...(cfg.deliveryDate && { deliveryDate: cfg.deliveryDate }),
    ...(cfg.postalCode && { postalCode: cfg.postalCode }),
    ...(cfg.windowId && { windowId: cfg.windowId }),
    ...(message && { message }),
    ...(message && { anonymous: Boolean(cfg.anonymous) }),
    ...(message && !cfg.anonymous && senderName && { senderName }),
    extras,
    snapshot: makeCartSnapshot(cfg.product, cfg.size),
  };
}

export function findSize(product: Product, sizeId: SizeId) {
  return product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];
}

/** The size pre-selected on the product page: the popular one, else the first. */
export function defaultSize(product: Product) {
  return product.sizes.find((s) => s.popular) ?? product.sizes[0];
}

export function extrasTotal(extras: CartExtra[]) {
  return Math.round(extras.reduce((s, e) => s + e.price * e.quantity, 0) * 100) / 100;
}

export function extrasCount(extras: CartExtra[]) {
  return extras.reduce((n, e) => n + e.quantity, 0);
}

export function truncateMessage(message: string, max = 48) {
  const flat = message.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export function isSoldOut(product: Product, size?: ProductSize | null) {
  if (product.stock !== null && product.stock <= 0) return true;
  if (size?.stock !== undefined && size.stock <= 0) return true;
  return false;
}

/**
 * Translations of CMS content (products, categories, occasions, extras, FAQ,
 * pages, homepage, settings texts). German content stays the source; each other
 * language has one document `i18n-{locale}` (content/i18n-{locale}.json, seeded
 * into the database like every content document) holding only the texts.
 * Prices, images, ids and slugs always come from the German document, so a
 * translation can never change a price or show a deleted product.
 *
 * Everything missing in a translation falls back to German.
 * Pure and client-safe.
 */
import type {
  Category, CmsPage, DeliveryZone, Extra, FAQ, HomepageContent, Occasion, Product, SiteSettings,
} from "@/types";

type Seo = { title?: string; description?: string };
type DeepPartial<T> = T extends string ? string : T extends (infer U)[] ? DeepPartial<U>[] : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

export interface ContentTranslations {
  products?: Record<string, {
    name?: string;
    tagline?: string;
    shortDescription?: string;
    description?: string;
    flowers?: string[];
    care?: string[];
    seo?: Seo;
    /** sizeId → texts */
    sizes?: Record<string, { label?: string; description?: string; detailAlt?: string }>;
    /** colorOption id → label */
    colorOptions?: Record<string, string>;
    /** image src → alt text */
    imageAlts?: Record<string, string>;
  }>;
  categories?: Record<string, { name?: string; headline?: string; intro?: string; seo?: Seo }>;
  occasions?: Record<string, { name?: string; headline?: string; intro?: string; imageAlt?: string; seo?: Seo }>;
  extras?: Record<string, { name?: string; description?: string; imageAlt?: string }>;
  faqs?: Record<string, { question?: string; answer?: string; category?: string }>;
  pages?: Record<string, {
    title?: string;
    intro?: string;
    /** Same order as the German sections. */
    sections?: { heading?: string; paragraphs?: string[]; imageAlt?: string }[];
    seo?: Seo;
  }>;
  /** Same shape as content/homepage.json, texts only (links/images are taken from German). */
  homepage?: DeepPartial<HomepageContent>;
  settings?: {
    claim?: string;
    seo?: { defaultTitle?: string; defaultDescription?: string };
    announcement?: { messages?: string[] };
    trust?: { title?: string; text?: string }[];
    /** status key → texts */
    orderStatuses?: Record<string, { label?: string; description?: string }>;
    /** payment method id → label */
    payments?: Record<string, string>;
    openingHours?: string[];
  };
  zones?: Record<string, { name?: string; note?: string; windows?: Record<string, string> }>;
}

const pick = (t: string | undefined, fallback: string) => (t && t.trim() ? t : fallback);
const pickList = (t: string[] | undefined, fallback: string[]) => (t && t.length === fallback.length && t.every((x) => x.trim()) ? t : fallback);

export function localizeProduct(p: Product, t?: ContentTranslations): Product {
  const x = t?.products?.[p.id];
  if (!x) return p;
  return {
    ...p,
    name: pick(x.name, p.name),
    tagline: pick(x.tagline, p.tagline),
    shortDescription: pick(x.shortDescription, p.shortDescription),
    description: pick(x.description, p.description),
    flowers: pickList(x.flowers, p.flowers),
    care: pickList(x.care, p.care),
    seo: { title: pick(x.seo?.title, p.seo.title), description: pick(x.seo?.description, p.seo.description) },
    images: p.images.map((i) => ({ ...i, alt: pick(x.imageAlts?.[i.src], i.alt) })),
    sizes: p.sizes.map((s) => {
      const st = x.sizes?.[s.id];
      return st
        ? { ...s, label: pick(st.label, s.label), ...(s.description !== undefined && { description: pick(st.description, s.description) }), ...(s.detailAlt !== undefined && { detailAlt: pick(st.detailAlt, s.detailAlt) }) }
        : s;
    }),
    ...(p.colorOptions && { colorOptions: p.colorOptions.map((c) => ({ ...c, label: pick(x.colorOptions?.[c.id], c.label) })) }),
  };
}

export function localizeCategory(c: Category, t?: ContentTranslations): Category {
  const x = t?.categories?.[c.slug];
  if (!x) return c;
  return { ...c, name: pick(x.name, c.name), headline: pick(x.headline, c.headline), intro: pick(x.intro, c.intro), seo: { title: pick(x.seo?.title, c.seo.title), description: pick(x.seo?.description, c.seo.description) } };
}

export function localizeOccasion(o: Occasion, t?: ContentTranslations): Occasion {
  const x = t?.occasions?.[o.slug];
  if (!x) return o;
  return { ...o, name: pick(x.name, o.name), headline: pick(x.headline, o.headline), intro: pick(x.intro, o.intro), imageAlt: pick(x.imageAlt, o.imageAlt), seo: { title: pick(x.seo?.title, o.seo.title), description: pick(x.seo?.description, o.seo.description) } };
}

export function localizeExtra(e: Extra, t?: ContentTranslations): Extra {
  const x = t?.extras?.[e.id];
  if (!x) return e;
  return { ...e, name: pick(x.name, e.name), description: pick(x.description, e.description), imageAlt: pick(x.imageAlt, e.imageAlt) };
}

export function localizeFaq(f: FAQ, t?: ContentTranslations): FAQ {
  const x = t?.faqs?.[f.id];
  if (!x) return f;
  return { ...f, question: pick(x.question, f.question), answer: pick(x.answer, f.answer), ...(f.category !== undefined && { category: pick(x.category, f.category) }) };
}

export function localizePage(p: CmsPage, t?: ContentTranslations): CmsPage {
  const x = t?.pages?.[p.slug];
  if (!x) return p;
  return {
    ...p,
    title: pick(x.title, p.title),
    ...(p.intro !== undefined && { intro: pick(x.intro, p.intro) }),
    seo: { title: pick(x.seo?.title, p.seo.title), description: pick(x.seo?.description, p.seo.description) },
    sections: p.sections.map((s, i) => {
      const st = x.sections?.[i];
      if (!st) return s;
      return {
        ...s,
        ...(s.heading !== undefined && { heading: pick(st.heading, s.heading) }),
        paragraphs: pickList(st.paragraphs, s.paragraphs),
        ...(s.image && { image: { ...s.image, alt: pick(st.imageAlt, s.image.alt) } }),
      };
    }),
  };
}

/** Deep merge for the homepage: only strings are replaced; arrays by index; links/images stay German. */
function mergeTexts<T>(base: T, over: unknown, key = ""): T {
  if (over === undefined || over === null) return base;
  if (typeof base === "string") {
    // URLs and image paths are never taken from a translation.
    if (/^(href|src|image|imageWide|imagePortrait|video)$/.test(key)) return base;
    return (typeof over === "string" && over.trim() ? over : base) as T;
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return base;
    return base.map((b, i) => mergeTexts(b, over[i], key)) as T;
  }
  if (base && typeof base === "object") {
    if (typeof over !== "object") return base;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(base as Record<string, unknown>)) {
      // Slug/id lists select content – never translated.
      out[k] = /^(slugs|productSlugs|ids)$/.test(k) ? v : mergeTexts(v, (over as Record<string, unknown>)[k], k);
    }
    return out as T;
  }
  return base;
}

export function localizeHomepage(h: HomepageContent, t?: ContentTranslations): HomepageContent {
  return t?.homepage ? mergeTexts(h, t.homepage) : h;
}

export function localizeSettings(s: SiteSettings, t?: ContentTranslations): SiteSettings {
  const x = t?.settings;
  if (!x) return s;
  return {
    ...s,
    brand: { ...s.brand, claim: pick(x.claim, s.brand.claim), openingHours: pickList(x.openingHours, s.brand.openingHours) },
    seo: { ...s.seo, defaultTitle: pick(x.seo?.defaultTitle, s.seo.defaultTitle), defaultDescription: pick(x.seo?.defaultDescription, s.seo.defaultDescription) },
    announcement: { ...s.announcement, messages: pickList(x.announcement?.messages, s.announcement.messages) },
    trust: s.trust.map((tr, i) => ({ ...tr, title: pick(x.trust?.[i]?.title, tr.title), text: pick(x.trust?.[i]?.text, tr.text) })),
    orderStatuses: s.orderStatuses.map((o) => ({ ...o, label: pick(x.orderStatuses?.[o.key]?.label, o.label), description: pick(x.orderStatuses?.[o.key]?.description, o.description) })),
    payments: s.payments.map((p) => ({ ...p, label: pick(x.payments?.[p.id], p.label) })),
  };
}

export function localizeZone(z: DeliveryZone, t?: ContentTranslations): DeliveryZone {
  const x = t?.zones?.[z.id];
  if (!x) return z;
  return {
    ...z,
    name: pick(x.name, z.name),
    ...(z.note !== undefined && { note: pick(x.note, z.note) }),
    windows: z.windows.map((w) => ({ ...w, label: pick(x.windows?.[w.id], w.label) })),
  };
}

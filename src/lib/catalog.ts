/**
 * Catalog helpers – filtering, sorting and search. Pure & isomorphic.
 */
import type { Category, Occasion, Product } from "@/types";

export const COLOR_OPTIONS = [
  { value: "rot", label: "Rot", swatch: "#8d2a2a" },
  { value: "rosa", label: "Rosa", swatch: "#e5a9b3" },
  { value: "weiss", label: "Weiß", swatch: "#f6f3ee" },
  { value: "creme", label: "Creme", swatch: "#eadfc7" },
  { value: "beige", label: "Beige", swatch: "#d3bd9c" },
  { value: "gelb", label: "Gelb", swatch: "#e9c65a" },
  { value: "orange", label: "Orange", swatch: "#d9803f" },
  { value: "lila", label: "Lila", swatch: "#9d86b8" },
  { value: "blau", label: "Blau", swatch: "#7d93b8" },
  { value: "burgund", label: "Burgund", swatch: "#6d2f3b" },
  { value: "gruen", label: "Grün", swatch: "#6f8a6a" },
];

export const STYLE_OPTIONS = [
  { value: "klassisch", label: "Klassisch" },
  { value: "romantisch", label: "Romantisch" },
  { value: "elegant", label: "Elegant" },
  { value: "modern", label: "Modern" },
  { value: "natuerlich", label: "Natürlich" },
  { value: "wild", label: "Wild" },
  { value: "froehlich", label: "Fröhlich" },
];

export const SEASON_OPTIONS = [
  { value: "fruehling", label: "Frühling" },
  { value: "sommer", label: "Sommer" },
  { value: "herbst", label: "Herbst" },
  { value: "winter", label: "Winter" },
  { value: "ganzjaehrig", label: "Ganzjährig" },
];

export const SIZE_OPTIONS = [
  { value: "s", label: "Small" },
  { value: "m", label: "Medium" },
  { value: "l", label: "Large" },
];

export const SORT_OPTIONS = [
  { value: "recommended", label: "Empfohlen" },
  { value: "bestseller", label: "Bestseller" },
  { value: "new", label: "Neu" },
  { value: "price-asc", label: "Preis aufsteigend" },
  { value: "price-desc", label: "Preis absteigend" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export interface ProductFilter {
  occasions?: string[];
  colors?: string[];
  styles?: string[];
  seasons?: string[];
  sizes?: string[];
  flowers?: string[];
  minPrice?: number;
  maxPrice?: number;
  sameDayOnly?: boolean;
  inStockOnly?: boolean;
  category?: string;
  query?: string;
}

/** Flower families used for the "Blumenart" filter – derived from product.flowers. */
export function flowerFamily(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("rose")) return "rosen";
  if (n.includes("pfingstrose")) return "pfingstrosen";
  if (n.includes("tulpe")) return "tulpen";
  if (n.includes("ranunkel")) return "ranunkeln";
  if (n.includes("hortensie")) return "hortensien";
  if (n.includes("dahlie")) return "dahlien";
  if (n.includes("lilie")) return "lilien";
  if (n.includes("sonnenblume")) return "sonnenblumen";
  if (n.includes("lavendel")) return "lavendel";
  if (n.includes("eukalyptus")) return "eukalyptus";
  return null;
}

export const FLOWER_OPTIONS = [
  { value: "rosen", label: "Rosen" },
  { value: "pfingstrosen", label: "Pfingstrosen" },
  { value: "tulpen", label: "Tulpen" },
  { value: "ranunkeln", label: "Ranunkeln" },
  { value: "hortensien", label: "Hortensien" },
  { value: "dahlien", label: "Dahlien" },
  { value: "lilien", label: "Lilien" },
  { value: "sonnenblumen", label: "Sonnenblumen" },
  { value: "lavendel", label: "Lavendel" },
  { value: "eukalyptus", label: "Eukalyptus" },
];

export function productFlowerFamilies(p: Product) {
  return Array.from(new Set(p.flowers.map(flowerFamily).filter((f): f is string => Boolean(f))));
}

export function matchesCategory(p: Product, category: Category) {
  if (category.slug === "alle") return true;
  const r = category.rule ?? {};
  if (p.category === category.slug) return true;
  if (r.categorySlugs?.includes(p.category)) return true;
  if (r.maxPrice !== undefined && p.basePrice <= r.maxPrice) return true;
  if (r.bestseller && p.bestseller) return true;
  if (r.isNew && p.isNew) return true;
  if (r.tags?.some((t) => p.tags.includes(t))) return true;
  if (r.colors?.length && r.colors.every((c) => p.colors.includes(c))) return true;
  if (r.styles?.some((s) => p.styles.includes(s)) && !r.categorySlugs) return true;
  return false;
}

export function applyFilter(products: Product[], f: ProductFilter, categories: Category[] = []) {
  const category = f.category ? categories.find((c) => c.slug === f.category) : undefined;
  const some = (sel: string[] | undefined, values: string[]) => !sel?.length || sel.some((v) => values.includes(v));
  return products.filter((p) => {
    if (!p.active) return false;
    if (category && !matchesCategory(p, category)) return false;
    if (!some(f.occasions, p.occasions)) return false;
    if (!some(f.colors, p.colors)) return false;
    if (!some(f.styles, p.styles)) return false;
    if (!some(f.seasons, p.seasons)) return false;
    if (!some(f.sizes, p.sizes.map((s) => s.id))) return false;
    if (!some(f.flowers, productFlowerFamilies(p))) return false;
    if (f.minPrice !== undefined && p.basePrice < f.minPrice) return false;
    if (f.maxPrice !== undefined && p.basePrice > f.maxPrice) return false;
    if (f.sameDayOnly && !p.sameDayCapable) return false;
    if (f.inStockOnly && p.stock !== null && p.stock <= 0) return false;
    if (f.query && scoreProduct(p, f.query) === 0) return false;
    return true;
  });
}

export function sortProducts(products: Product[], sort: SortValue) {
  const arr = [...products];
  switch (sort) {
    case "price-asc": return arr.sort((a, b) => a.basePrice - b.basePrice);
    case "price-desc": return arr.sort((a, b) => b.basePrice - a.basePrice);
    case "new": return arr.sort((a, b) => Number(b.isNew) - Number(a.isNew) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    case "bestseller": return arr.sort((a, b) => Number(b.bestseller) - Number(a.bestseller) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    default: return arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}

/* ---------------- Search ---------------- */

const SYNONYMS: Record<string, string[]> = {
  mama: ["muttertag", "danke", "pastell", "rosa", "mutter"],
  mutter: ["muttertag", "danke", "pastell"],
  muttertag: ["danke", "pastell", "rosa"],
  papa: ["danke", "geburtstag", "sonnenblumen"],
  freundin: ["liebe", "rosen", "romantisch"],
  freund: ["liebe", "rosen"],
  valentinstag: ["liebe", "rosen", "rot"],
  hochzeitstag: ["jahrestag", "liebe"],
  beileid: ["trauer", "weiß", "stille"],
  kondolenz: ["trauer", "weiß"],
  krank: ["gute-besserung", "lavendel"],
  genesung: ["gute-besserung"],
  baby: ["geburt", "pastell"],
  büro: ["abo", "elegant", "weiß"],
  günstig: ["unter-40", "petit"],
  billig: ["unter-40", "petit"],
  klein: ["petit", "unter-40"],
  groß: ["large", "premium"],
  weiß: ["weiss", "elegant-weiss"],
  weiss: ["weiß", "elegant-weiss"],
  gelb: ["sonnenblumen", "solstice"],
  rot: ["amour", "rosen", "liebe"],
  heute: ["sameday", "same-day"],
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").trim();
}

function expandQuery(q: string) {
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  const expanded = new Set(terms);
  for (const t of terms) {
    for (const [k, vs] of Object.entries(SYNONYMS)) {
      if (normalize(k).startsWith(t) || t.startsWith(normalize(k))) vs.forEach((v) => expanded.add(normalize(v)));
    }
  }
  return Array.from(expanded);
}

export function scoreProduct(p: Product, query: string) {
  const terms = expandQuery(query);
  if (!terms.length) return 0;
  const hay = {
    name: normalize(p.name),
    tagline: normalize(p.tagline),
    flowers: normalize(p.flowers.join(" ")),
    tags: normalize([...p.tags, ...p.colors, ...p.styles, ...p.occasions, p.category, p.sameDayCapable ? "sameday same-day heute" : ""].join(" ")),
    text: normalize(`${p.shortDescription} ${p.description}`),
  };
  let score = 0;
  for (const t of terms) {
    if (hay.name.includes(t)) score += 10;
    if (hay.tagline.includes(t)) score += 6;
    if (hay.flowers.includes(t)) score += 6;
    if (hay.tags.includes(t)) score += 4;
    if (hay.text.includes(t)) score += 1;
  }
  return score;
}

export interface SearchResult {
  products: Product[];
  occasions: Occasion[];
  categories: Category[];
}

export function search(query: string, products: Product[], occasions: Occasion[], categories: Category[], limit = 6): SearchResult {
  const q = normalize(query);
  if (q.length < 2) return { products: [], occasions: [], categories: [] };
  const terms = expandQuery(q);
  const scored = products
    .map((p) => ({ p, s: scoreProduct(p, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || Number(b.p.bestseller) - Number(a.p.bestseller))
    .slice(0, limit)
    .map((x) => x.p);
  const occ = occasions.filter((o) => terms.some((t) => normalize(o.name).includes(t) || o.slug.includes(t))).slice(0, 4);
  const cats = categories.filter((c) => c.slug !== "alle" && terms.some((t) => normalize(c.name).includes(t) || c.slug.includes(t))).slice(0, 4);
  return { products: scored, occasions: occ, categories: cats };
}

export function lowestPrice(p: Product) {
  return Math.min(...p.sizes.map((s) => s.price));
}

export function productBadges(p: Product): { kind: "bestseller" | "new" | "seasonal"; label: string }[] {
  const b: { kind: "bestseller" | "new" | "seasonal"; label: string }[] = [];
  if (p.bestseller) b.push({ kind: "bestseller", label: "Bestseller" });
  if (p.isNew) b.push({ kind: "new", label: "Neu" });
  if (p.category === "saisonal" && !p.isNew) b.push({ kind: "seasonal", label: "Saisonal" });
  return b;
}

export function primaryImage(p: Product) {
  return p.images.find((i) => i.kind === "front") ?? p.images[0];
}
export function hoverImage(p: Product) {
  return p.images.find((i) => i.kind === "lifestyle" || i.kind === "detail") ?? null;
}

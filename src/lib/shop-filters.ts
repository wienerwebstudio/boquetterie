/**
 * Shop listing URL state. Isomorphic – used by server pages (to filter) and by
 * client controls (to read/update the URL). All filters live in the query string
 * so every result set is shareable and server-rendered.
 *
 *   ?anlass=geburtstag,danke&preis=40-60&blume=rosen&farbe=rot,rosa&groesse=m
 *   &stil=elegant&saison=sommer&sameday=1&lager=1&datum=2026-09-12&plz=1010&sort=new
 */
import type { Product } from "@/types";
import {
  COLOR_OPTIONS, FLOWER_OPTIONS, SEASON_OPTIONS, SIZE_OPTIONS, SORT_OPTIONS, STYLE_OPTIONS,
  type ProductFilter, type SortValue,
} from "@/lib/catalog";

export const PRICE_PRESETS = [
  { value: "bis-40", label: "bis 40 €", max: 40 },
  { value: "40-60", label: "40 – 60 €", min: 40, max: 60 },
  { value: "60-90", label: "60 – 90 €", min: 60, max: 90 },
  { value: "ab-90", label: "ab 90 €", min: 90 },
] as const;
export type PricePreset = (typeof PRICE_PRESETS)[number]["value"];

export const AVAILABILITY_OPTIONS = [
  { value: "sameday", label: "Heute lieferbar", hint: "Sträuße, die wir am selben Tag binden können" },
  { value: "lager", label: "Auf Lager", hint: "Sofort bestellbar" },
] as const;

/** Multi-select list keys (comma separated in the URL). */
export const LIST_KEYS = ["anlass", "blume", "farbe", "groesse", "stil", "saison"] as const;
export type ListKey = (typeof LIST_KEYS)[number];

export const FILTER_KEYS = [...LIST_KEYS, "preis", "sameday", "lager", "datum", "plz"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export interface ShopParams {
  anlass: string[];
  blume: string[];
  farbe: string[];
  groesse: string[];
  stil: string[];
  saison: string[];
  preis: PricePreset | null;
  sameday: boolean;
  lager: boolean;
  datum: string | null; // YYYY-MM-DD
  plz: string | null; // 4 digits
  sort: SortValue;
}

export const EMPTY_PARAMS: ShopParams = {
  anlass: [], blume: [], farbe: [], groesse: [], stil: [], saison: [],
  preis: null, sameday: false, lager: false, datum: null, plz: null, sort: "recommended",
};

/** Option lists needed to render filters and chips. Occasions come from content. */
export interface FilterOptions {
  occasions: { value: string; label: string }[];
  today: string; // shop-local YYYY-MM-DD
  maxDate: string;
}

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function readParam(raw: RawParams, key: string): string | undefined {
  if (raw instanceof URLSearchParams) {
    const all = raw.getAll(key);
    return all.length ? all.join(",") : undefined;
  }
  const v = raw[key];
  if (Array.isArray(v)) return v.join(",");
  return v;
}

const isSort = (v: string | undefined): v is SortValue => SORT_OPTIONS.some((o) => o.value === v);
const isPrice = (v: string | undefined): v is PricePreset => PRICE_PRESETS.some((o) => o.value === v);

function readList(raw: RawParams, key: string, allowed?: string[]) {
  const v = readParam(raw, key);
  if (!v) return [];
  const values = Array.from(new Set(v.split(",").map((s) => s.trim()).filter(Boolean)));
  return allowed ? values.filter((x) => allowed.includes(x)) : values.slice(0, 20);
}

export function parseShopParams(raw: RawParams): ShopParams {
  const datum = readParam(raw, "datum");
  const plz = readParam(raw, "plz")?.replace(/\D/g, "").slice(0, 4);
  const sort = readParam(raw, "sort");
  const preis = readParam(raw, "preis");
  return {
    anlass: readList(raw, "anlass"),
    blume: readList(raw, "blume", FLOWER_OPTIONS.map((o) => o.value)),
    farbe: readList(raw, "farbe", COLOR_OPTIONS.map((o) => o.value)),
    groesse: readList(raw, "groesse", SIZE_OPTIONS.map((o) => o.value)),
    stil: readList(raw, "stil", STYLE_OPTIONS.map((o) => o.value)),
    saison: readList(raw, "saison", SEASON_OPTIONS.map((o) => o.value)),
    preis: isPrice(preis) ? preis : null,
    sameday: readParam(raw, "sameday") === "1",
    lager: readParam(raw, "lager") === "1",
    datum: datum && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? datum : null,
    plz: plz && /^[1-9]\d{3}$/.test(plz) ? plz : null,
    sort: isSort(sort) ? sort : "recommended",
  };
}

/** Serialise back to a query string – defaults are omitted so URLs stay clean. */
export function serializeShopParams(p: ShopParams): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of LIST_KEYS) if (p[key].length) sp.set(key, p[key].join(","));
  if (p.preis) sp.set("preis", p.preis);
  if (p.sameday) sp.set("sameday", "1");
  if (p.lager) sp.set("lager", "1");
  if (p.datum) sp.set("datum", p.datum);
  if (p.plz) sp.set("plz", p.plz);
  if (p.sort !== "recommended") sp.set("sort", p.sort);
  return sp;
}

export function shopHref(pathname: string, p: ShopParams) {
  const qs = serializeShopParams(p).toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function toProductFilter(p: ShopParams, fixed: { category?: string; occasions?: string[] } = {}): ProductFilter {
  const preset = PRICE_PRESETS.find((x) => x.value === p.preis);
  return {
    category: fixed.category,
    occasions: fixed.occasions?.length ? fixed.occasions : p.anlass,
    flowers: p.blume,
    colors: p.farbe,
    sizes: p.groesse,
    styles: p.stil,
    seasons: p.saison,
    minPrice: preset && "min" in preset ? preset.min : undefined,
    maxPrice: preset && "max" in preset ? preset.max : undefined,
    sameDayOnly: p.sameday,
    inStockOnly: p.lager,
  };
}

/** Number of active filter selections (sort excluded). */
export function countActiveFilters(p: ShopParams, ignore: FilterKey[] = []) {
  let n = 0;
  for (const key of LIST_KEYS) if (!ignore.includes(key)) n += p[key].length;
  if (p.preis && !ignore.includes("preis")) n += 1;
  if (p.sameday && !ignore.includes("sameday")) n += 1;
  if (p.lager && !ignore.includes("lager")) n += 1;
  if (p.datum && !ignore.includes("datum")) n += 1;
  if (p.plz && !ignore.includes("plz")) n += 1;
  return n;
}

export function resetFilters(p: ShopParams): ShopParams {
  return { ...EMPTY_PARAMS, sort: p.sort };
}

export interface FilterChip { key: FilterKey; value: string; label: string }

const labelOf = (list: readonly { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? v;

export function filterChips(p: ShopParams, options: FilterOptions, ignore: FilterKey[] = []): FilterChip[] {
  const chips: FilterChip[] = [];
  const push = (key: FilterKey, value: string, label: string) => { if (!ignore.includes(key)) chips.push({ key, value, label }); };
  p.anlass.forEach((v) => push("anlass", v, labelOf(options.occasions, v)));
  if (p.preis) push("preis", p.preis, labelOf(PRICE_PRESETS, p.preis));
  p.blume.forEach((v) => push("blume", v, labelOf(FLOWER_OPTIONS, v)));
  p.farbe.forEach((v) => push("farbe", v, labelOf(COLOR_OPTIONS, v)));
  p.groesse.forEach((v) => push("groesse", v, labelOf(SIZE_OPTIONS, v)));
  p.stil.forEach((v) => push("stil", v, labelOf(STYLE_OPTIONS, v)));
  p.saison.forEach((v) => push("saison", v, labelOf(SEASON_OPTIONS, v)));
  if (p.sameday) push("sameday", "1", "Heute lieferbar");
  if (p.lager) push("lager", "1", "Auf Lager");
  if (p.datum) push("datum", p.datum, `Lieferung ${formatChipDate(p.datum)}`);
  if (p.plz) push("plz", p.plz, `PLZ ${p.plz}`);
  return chips;
}

function formatChipDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("de-AT", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

export function removeChip(p: ShopParams, chip: FilterChip): ShopParams {
  const next = { ...p };
  switch (chip.key) {
    case "preis": next.preis = null; break;
    case "sameday": next.sameday = false; break;
    case "lager": next.lager = false; break;
    case "datum": next.datum = null; break;
    case "plz": next.plz = null; break;
    default: next[chip.key] = p[chip.key].filter((v) => v !== chip.value);
  }
  return next;
}

export function toggleListValue(p: ShopParams, key: ListKey, value: string): ShopParams {
  const list = p[key];
  return { ...p, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
}

/** Stable, human readable result wording. */
export function resultLabel(n: number) {
  return n === 1 ? "1 Strauß" : `${n} Sträuße`;
}

/** Is a product a candidate for a given delivery date without knowing the zone? */
export function roughlyDeliverableOn(p: Product, date: string, today: string) {
  if (!p.deliverable) return false;
  if (date === today) return p.sameDayCapable;
  return date > today;
}

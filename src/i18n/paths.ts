/**
 * Public URLs per language ↔ internal routes.
 *
 * Internal routes are `/{locale}/{German path}` (app/[locale]/...). German is
 * served without prefix; other languages get a prefix and translated first
 * path segments, e.g. `/tr/cicekler/rosen` ↔ `/tr/blumen/rosen`.
 * Product, category and occasion slugs stay the same in every language.
 *
 * Pure and client-safe (used by the proxy, links and sitemaps).
 */
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";

/** German first path segments that get a translated name. Everything else keeps its German name. */
const SEGMENTS = [
  "blumen", "produkt", "anlaesse", "geschenksets", "geschenkfinder", "firmenkunden", "erinnerung",
  "lieferung", "ueber-uns", "kontakt", "faq", "warenkorb", "suche", "bestellung-verfolgen",
] as const;
type Segment = (typeof SEGMENTS)[number];

const T = (...names: string[]) => Object.fromEntries(SEGMENTS.map((s, i) => [s, names[i]])) as Record<Segment, string>;

// Order: blumen, produkt, anlaesse, geschenksets, geschenkfinder, firmenkunden, erinnerung,
//        lieferung, ueber-uns, kontakt, faq, warenkorb, suche, bestellung-verfolgen
const EN = T("flowers", "product", "occasions", "gift-sets", "gift-finder", "business", "reminder", "delivery", "about-us", "contact", "faq", "cart", "search", "track-order");

export const SEGMENT_NAMES: Record<Exclude<Locale, "de">, Record<Segment, string>> = {
  en: EN,
  tr: T("cicekler", "urun", "ozel-gunler", "hediye-setleri", "hediye-bulucu", "kurumsal", "hatirlatici", "teslimat", "hakkimizda", "iletisim", "sss", "sepet", "arama", "siparis-takibi"),
  bks: T("cvijece", "proizvod", "prilike", "poklon-setovi", "izbor-poklona", "za-firme", "podsjetnik", "dostava", "o-nama", "kontakt", "cesta-pitanja", "korpa", "pretraga", "pracenje-narudzbe"),
  uk: T("kvity", "tovar", "pryvody", "podarunkovi-nabory", "pidbir-podarunka", "dlia-biznesu", "nahaduvannia", "dostavka", "pro-nas", "kontakty", "pytannia", "koshyk", "poshuk", "vidstezhennia"),
  ru: T("cvety", "tovar", "povody", "podarochnye-nabory", "podbor-podarka", "dlya-biznesa", "napominanie", "dostavka", "o-nas", "kontakty", "voprosy", "korzina", "poisk", "otslezhivanie"),
  pl: T("kwiaty", "produkt", "okazje", "zestawy-prezentowe", "pomysl-na-prezent", "dla-firm", "przypomnienie", "dostawa", "o-nas", "kontakt", "pytania", "koszyk", "szukaj", "sledzenie-zamowienia"),
  ro: T("flori", "produs", "ocazii", "seturi-cadou", "idei-cadou", "pentru-companii", "memento", "livrare", "despre-noi", "contact", "intrebari", "cos", "cautare", "urmarire-comanda"),
  hu: T("viragok", "termek", "alkalmak", "ajandekcsomagok", "ajandekotlet", "cegeknek", "emlekezteto", "szallitas", "rolunk", "kapcsolat", "gyik", "kosar", "kereses", "rendeles-kovetes"),
  ar: EN,
  bg: T("tsvetya", "produkt", "povodi", "podaracni-komplekti", "podbor-na-podarak", "za-firmi", "napomnyane", "dostavka", "za-nas", "kontakti", "vaprosi", "koshnitsa", "tarsene", "prosledyavane"),
  fa: EN,
  sk: T("kvety", "produkt", "prilezitosti", "darcekove-sady", "vyber-darceka", "pre-firmy", "pripomienka", "dorucenie", "o-nas", "kontakt", "otazky", "kosik", "hladat", "sledovanie-objednavky"),
  it: T("fiori", "prodotto", "occasioni", "set-regalo", "idee-regalo", "aziende", "promemoria", "consegna", "chi-siamo", "contatti", "domande", "carrello", "cerca", "traccia-ordine"),
  fr: T("fleurs", "produit", "occasions", "coffrets-cadeaux", "idees-cadeaux", "entreprises", "rappel", "livraison", "a-propos", "contact", "questions", "panier", "recherche", "suivi-commande"),
  ce: EN,
  es: T("flores", "producto", "ocasiones", "sets-regalo", "ideas-regalo", "empresas", "recordatorio", "entrega", "sobre-nosotros", "contacto", "preguntas", "carrito", "buscar", "seguimiento-pedido"),
};

const REVERSE: Record<string, Record<string, Segment>> = Object.fromEntries(
  Object.entries(SEGMENT_NAMES).map(([loc, map]) => [loc, Object.fromEntries(Object.entries(map).map(([de, x]) => [x, de as Segment]))]),
);

function splitPath(path: string): { path: string; rest: string } {
  const i = path.search(/[?#]/);
  return i === -1 ? { path, rest: "" } : { path: path.slice(0, i), rest: path.slice(i) };
}

/**
 * German path (as in `routes`) → public URL path for a language.
 * `localizePath("tr", "/blumen/rosen?x=1")` → `/tr/cicekler/rosen?x=1`.
 * External URLs, anchors and non-root paths are returned unchanged.
 */
export function localizePath(locale: Locale, href: string): string {
  if (locale === DEFAULT_LOCALE || !href.startsWith("/") || href.startsWith("//")) return href;
  const { path, rest } = splitPath(href);
  if (isUnprefixedSystemPath(path)) return href;
  const parts = path.split("/").filter(Boolean);
  if (parts.length && (SEGMENTS as readonly string[]).includes(parts[0])) parts[0] = SEGMENT_NAMES[locale as Exclude<Locale, "de">][parts[0] as Segment];
  return `/${locale}${parts.length ? `/${parts.join("/")}` : ""}${rest}`;
}

/** Paths that are never language-prefixed: admin, API, media, the Partner-Portal and files. */
export function isUnprefixedSystemPath(path: string) {
  return /^\/(admin|api|_next|media|partner)(\/|$)/.test(path) || /\.[a-z0-9]+$/i.test(path);
}

export interface ResolvedPath {
  locale: Locale;
  /** Internal route: `/{locale}/{German path}`. */
  internal: string;
  /** Set when the public URL is not the canonical one (e.g. `/de/...`, German segment under `/en`). */
  redirect?: string;
}

/** Public URL path → internal route (used by the proxy). `null` for system paths. */
export function resolvePublicPath(pathname: string): ResolvedPath | null {
  if (isUnprefixedSystemPath(pathname)) return null;
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0];
  if (first === DEFAULT_LOCALE) {
    const rest = parts.slice(1).join("/");
    return { locale: DEFAULT_LOCALE, internal: `/de${rest ? `/${rest}` : ""}`, redirect: `/${rest}` };
  }
  if (isLocale(first)) {
    const locale = first;
    const rest = parts.slice(1);
    if (rest.length) {
      const german = REVERSE[locale][rest[0]];
      if (german) rest[0] = german;
      else if ((SEGMENTS as readonly string[]).includes(rest[0]) && SEGMENT_NAMES[locale as Exclude<Locale, "de">][rest[0] as Segment] !== rest[0]) {
        // German segment under another language → canonical translated URL.
        const internal = `/${locale}/${rest.join("/")}`;
        return { locale, internal, redirect: localizePath(locale, `/${rest.join("/")}`) };
      }
    }
    return { locale, internal: `/${locale}${rest.length ? `/${rest.join("/")}` : ""}` };
  }
  return { locale: DEFAULT_LOCALE, internal: `/de${pathname === "/" ? "" : pathname}` };
}

/** Internal route params → German path, e.g. for `localizePath` from a page. */
export function stripLocale(internal: string): string {
  const parts = internal.split("/").filter(Boolean);
  if (isLocale(parts[0])) parts.shift();
  return `/${parts.join("/")}`;
}

/** German top-level routes that exist in every language (the rest are topic pages of one language). */
const SHARED_ROUTES = new Set<string>([
  ...SEGMENTS, "checkout", "bestellung", "konto", "bewertung", "auth", "newsletter", "partner-auftrag",
  "impressum", "datenschutz", "agb", "widerruf", "vertrag-widerrufen", "blumen-abo", "angebot",
]);

/**
 * URL of the current page in another language. Topic pages exist per language only,
 * so they lead to the home page of the other language.
 */
export function switchLocalePath(publicPath: string, target: Locale): string {
  const resolved = resolvePublicPath(publicPath.split(/[?#]/)[0]);
  if (!resolved) return localizePath(target, "/");
  const german = stripLocale(resolved.internal);
  const first = german.split("/").filter(Boolean)[0];
  if (first && !SHARED_ROUTES.has(first)) return localizePath(target, "/");
  return localizePath(target, german);
}

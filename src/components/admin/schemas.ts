/**
 * Field schemas for the admin forms.
 *
 * Every editable entity is described declaratively here; `EntityForm` renders
 * the form and `saveEntity` validates against the same schema on the server.
 * Keep this file free of server-only imports – it is shared with the client.
 */
import { COLOR_OPTIONS, SEASON_OPTIONS, SIZE_OPTIONS, STYLE_OPTIONS } from "@/lib/catalog";
import type { Json } from "./paths";

export type AdminCollection =
  | "products" | "categories" | "occasions" | "extras" | "delivery-zones"
  | "coupons" | "faqs" | "reviews" | "landing-pages" | "pages";
export type SingletonCollection = "settings" | "homepage" | "subscription";
export type OptionSource = "categories" | "occasions" | "products" | "faqs" | "extras";

export type FieldType =
  | "text" | "textarea" | "lines" | "number" | "boolean" | "select" | "multiselect"
  | "tags" | "list" | "stringlist" | "image" | "date" | "time";

export interface FieldOption { value: string; label: string }

export interface FieldDef {
  /** Dot path inside the entity (or inside the row for list fields). */
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** Static options for select / multiselect. */
  options?: FieldOption[];
  /** Options resolved on the server from another collection. */
  optionsFrom?: OptionSource;
  /** select / multiselect: store numbers instead of strings. */
  valueType?: "string" | "number";
  /** multiselect: keep the selection order editable (chips with up/down). */
  ordered?: boolean;
  /** number: empty input becomes `null` (instead of being removed). */
  nullable?: boolean;
  min?: number;
  max?: number;
  step?: number;
  /** list: row fields. */
  fields?: FieldDef[];
  /** list: label for a row, e.g. "Größe". */
  itemLabel?: string;
  /** list: rows cannot be added or removed (fixed union types). */
  fixedLength?: boolean;
  /** stringlist: input type of each row. */
  itemType?: "text" | "date" | "time";
  readonly?: boolean;
  /** Grid width on desktop. Default: half. */
  span?: "third" | "half" | "full";
  rows?: number;
}

export interface FieldSection {
  title: string;
  description?: string;
  fields: FieldDef[];
}

export type ColumnType = "text" | "price" | "boolean" | "number" | "image" | "list" | "date" | "rating";
export interface ColumnDef { key: string; label: string; type?: ColumnType }

export interface EntitySchema {
  collection: AdminCollection;
  /** URL segment under /admin. */
  slug: string;
  idKey: "id" | "slug" | "code";
  labelKey: string;
  singular: string;
  plural: string;
  description?: string;
  sections: FieldSection[];
  columns: ColumnDef[];
  /** Default values for a new entity. */
  template: Json;
  /** Dot-path patterns (array items as `*`) of optional objects that may be dropped when empty. */
  removeEmptyObjectsAt?: string[];
  /** Field key whose value is turned into the storefront URL (list page link). */
  storefrontPath?: string;
}

export interface SingletonSchema {
  collection: SingletonCollection;
  slug: string;
  title: string;
  description?: string;
  sections: FieldSection[];
  removeEmptyObjectsAt?: string[];
}

/* ---------------- shared snippets ---------------- */

const seoSection = (what: string): FieldSection => ({
  title: "SEO",
  description: `Titel und Beschreibung für Suchmaschinen (${what}).`,
  fields: [
    { key: "seo.title", label: "SEO-Titel", type: "text", required: true, span: "full", hint: "Ideal 50–60 Zeichen." },
    { key: "seo.description", label: "SEO-Beschreibung", type: "textarea", required: true, span: "full", rows: 3, hint: "Ideal 120–160 Zeichen." },
  ],
});

const richSectionsField = (key = "sections"): FieldDef => ({
  key,
  label: "Abschnitte",
  type: "list",
  itemLabel: "Abschnitt",
  span: "full",
  fields: [
    { key: "heading", label: "Überschrift", type: "text", span: "full" },
    { key: "paragraphs", label: "Absätze", type: "lines", span: "full", rows: 5, hint: "Ein Absatz pro Zeile." },
    { key: "image.src", label: "Bild", type: "image" },
    { key: "image.alt", label: "Bild-Alternativtext", type: "text" },
    { key: "placeholder", label: "Platzhalter (Inhalt fehlt noch)", type: "boolean", span: "full" },
  ],
});

const WEEKDAY_OPTIONS: FieldOption[] = [
  { value: "1", label: "Montag" }, { value: "2", label: "Dienstag" }, { value: "3", label: "Mittwoch" },
  { value: "4", label: "Donnerstag" }, { value: "5", label: "Freitag" }, { value: "6", label: "Samstag" }, { value: "0", label: "Sonntag" },
];

const IMAGE_KIND_OPTIONS: FieldOption[] = [
  { value: "front", label: "Hauptbild" }, { value: "detail", label: "Detail" }, { value: "size", label: "Größenvergleich" },
  { value: "packaging", label: "Verpackung" }, { value: "lifestyle", label: "Lifestyle" },
];

const asOptions = (list: { value: string; label: string }[]): FieldOption[] => list.map(({ value, label }) => ({ value, label }));

/* ---------------- collections ---------------- */

export const productSchema: EntitySchema = {
  collection: "products",
  slug: "produkte",
  idKey: "id",
  labelKey: "name",
  singular: "Produkt",
  plural: "Produkte",
  description: "Sträuße mit Größen, Preisen, Bildern und Zuordnungen.",
  storefrontPath: "slug",
  removeEmptyObjectsAt: ["rating"],
  sections: [
    {
      title: "Basis",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "slug", label: "Slug (URL)", type: "text", hint: "Leer lassen → wird aus dem Namen erzeugt.", placeholder: "wird automatisch erzeugt" },
        { key: "id", label: "Produkt-ID", type: "text", hint: "Leer lassen → p-<slug>. Nach dem Anlegen nicht mehr ändern.", placeholder: "wird automatisch vergeben" },
        { key: "category", label: "Kategorie", type: "select", optionsFrom: "categories", required: true },
        { key: "tagline", label: "Kurzzeile (unter dem Namen)", type: "text", required: true, placeholder: "z. B. Rote Gartenrosen & Eukalyptus" },
        { key: "sortOrder", label: "Sortierung", type: "number", hint: "Kleine Zahl = weiter vorne.", span: "third" },
      ],
    },
    {
      title: "Beschreibung & Pflege",
      fields: [
        { key: "shortDescription", label: "Kurzbeschreibung", type: "textarea", required: true, span: "full", rows: 3 },
        { key: "description", label: "Beschreibung", type: "textarea", required: true, span: "full", rows: 6 },
        { key: "flowers", label: "Blumen", type: "lines", span: "half", rows: 5, hint: "Eine Blumensorte pro Zeile." },
        { key: "care", label: "Pflegehinweise", type: "lines", span: "half", rows: 5, hint: "Ein Hinweis pro Zeile." },
      ],
    },
    {
      title: "Bilder",
      description: "Pfade unter /public, z. B. /images/products/amour-1.jpg. Das erste Bild mit Art „Hauptbild“ ist das Hauptbild.",
      fields: [
        {
          key: "images", label: "Bilder", type: "list", itemLabel: "Bild", span: "full",
          fields: [
            { key: "src", label: "Bildpfad", type: "image", required: true },
            { key: "alt", label: "Alternativtext", type: "text", required: true },
            { key: "kind", label: "Art", type: "select", options: IMAGE_KIND_OPTIONS, required: true, span: "third" },
          ],
        },
      ],
    },
    {
      title: "Zuordnung",
      fields: [
        { key: "occasions", label: "Anlässe", type: "multiselect", optionsFrom: "occasions", span: "full" },
        { key: "colors", label: "Farben", type: "multiselect", options: asOptions(COLOR_OPTIONS), span: "full" },
        { key: "styles", label: "Stile", type: "multiselect", options: asOptions(STYLE_OPTIONS), span: "full" },
        { key: "seasons", label: "Saisons", type: "multiselect", options: asOptions(SEASON_OPTIONS), span: "full" },
        { key: "tags", label: "Tags", type: "tags", span: "full", hint: "Mit Komma trennen. Werden für Suche und Kategorie-Regeln genutzt." },
      ],
    },
    {
      title: "Größen & Preise",
      description: "Der Preis „ab“ wird automatisch aus der günstigsten Größe berechnet.",
      fields: [
        {
          key: "sizes", label: "Größen", type: "list", itemLabel: "Größe", span: "full",
          fields: [
            { key: "id", label: "Größe", type: "select", options: asOptions(SIZE_OPTIONS), required: true, span: "third" },
            { key: "label", label: "Bezeichnung", type: "text", required: true, span: "third" },
            { key: "price", label: "Preis (€)", type: "number", required: true, step: 0.1, min: 0, span: "third" },
            { key: "compareAtPrice", label: "Streichpreis (€)", type: "number", step: 0.1, min: 0, span: "third" },
            { key: "stems", label: "Stiele", type: "number", min: 0, span: "third" },
            { key: "stock", label: "Lager (leer = unbegrenzt)", type: "number", min: 0, span: "third" },
            { key: "description", label: "Beschreibung", type: "text", placeholder: "ca. 15 Stiele" },
            { key: "image", label: "Größen-Bild (optional)", type: "image" },
            { key: "popular", label: "Beliebteste Größe", type: "boolean", span: "full" },
          ],
        },
        { key: "basePrice", label: "Preis ab (€) – automatisch", type: "number", readonly: true, span: "third" },
      ],
    },
    {
      title: "Verfügbarkeit",
      fields: [
        { key: "stock", label: "Lagerbestand (leer = unbegrenzt)", type: "number", nullable: true, min: 0, span: "third" },
        { key: "active", label: "Aktiv (im Shop sichtbar)", type: "boolean" },
        { key: "deliverable", label: "Lieferbar", type: "boolean" },
        { key: "sameDayCapable", label: "Same-Day-fähig", type: "boolean" },
        { key: "bestseller", label: "Bestseller", type: "boolean" },
        { key: "isNew", label: "Neu", type: "boolean" },
      ],
    },
    {
      title: "Bewertung",
      description: "Optional. Wird nur angezeigt, wenn Anzahl größer als 0 ist.",
      fields: [
        { key: "rating.value", label: "Bewertung (1–5)", type: "number", min: 1, max: 5, step: 0.1, span: "third" },
        { key: "rating.count", label: "Anzahl Bewertungen", type: "number", min: 0, span: "third" },
      ],
    },
    seoSection("Produktseite"),
  ],
  columns: [
    { key: "images.0.src", label: "", type: "image" },
    { key: "name", label: "Name" },
    { key: "category", label: "Kategorie" },
    { key: "basePrice", label: "Preis ab", type: "price" },
    { key: "stock", label: "Lager", type: "number" },
    { key: "sameDayCapable", label: "Same-Day", type: "boolean" },
    { key: "active", label: "Aktiv", type: "boolean" },
  ],
  template: {
    name: "", slug: "", tagline: "", shortDescription: "", description: "",
    flowers: [], care: [], images: [{ src: "", alt: "", kind: "front" }],
    category: "", occasions: [], colors: [], styles: [], seasons: ["ganzjaehrig"], tags: [],
    sizes: [
      { id: "s", label: "Small", price: 0 },
      { id: "m", label: "Medium", price: 0, popular: true },
      { id: "l", label: "Large", price: 0 },
    ],
    basePrice: 0, stock: null, deliverable: true, bestseller: false, isNew: true, sameDayCapable: true, active: false,
    seo: { title: "", description: "" }, sortOrder: 99,
  },
};

export const categorySchema: EntitySchema = {
  collection: "categories",
  slug: "kategorien",
  idKey: "slug",
  labelKey: "name",
  singular: "Kategorie",
  plural: "Kategorien",
  description: "Kollektionen im Shop. Produkte gehören per Zuordnung oder Regel dazu.",
  removeEmptyObjectsAt: ["rule"],
  sections: [
    {
      title: "Basis",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "slug", label: "Slug (URL)", type: "text", hint: "Leer lassen → wird aus dem Namen erzeugt.", placeholder: "wird automatisch erzeugt" },
        { key: "headline", label: "Überschrift", type: "text", required: true, span: "full" },
        { key: "intro", label: "Einleitung", type: "textarea", required: true, span: "full", rows: 3 },
        { key: "image", label: "Bild", type: "image" },
        { key: "showInNav", label: "In der Navigation zeigen", type: "boolean" },
        { key: "sortOrder", label: "Sortierung", type: "number", required: true, span: "third" },
      ],
    },
    {
      title: "Regel (optional)",
      description: "Produkte, die eine dieser Bedingungen erfüllen, erscheinen zusätzlich in dieser Kategorie.",
      fields: [
        { key: "rule.categorySlugs", label: "Produkte aus Kategorien", type: "multiselect", optionsFrom: "categories", span: "full" },
        { key: "rule.maxPrice", label: "Maximaler Preis (€)", type: "number", min: 0, span: "third" },
        { key: "rule.bestseller", label: "Bestseller", type: "boolean", span: "third" },
        { key: "rule.isNew", label: "Neue Produkte", type: "boolean", span: "third" },
        { key: "rule.colors", label: "Farben (alle müssen zutreffen)", type: "multiselect", options: asOptions(COLOR_OPTIONS), span: "full" },
        { key: "rule.styles", label: "Stile", type: "multiselect", options: asOptions(STYLE_OPTIONS), span: "full" },
        { key: "rule.tags", label: "Tags", type: "tags", span: "full" },
      ],
    },
    seoSection("Kategorieseite"),
  ],
  columns: [
    { key: "image", label: "", type: "image" },
    { key: "name", label: "Name" },
    { key: "slug", label: "Slug" },
    { key: "showInNav", label: "Navigation", type: "boolean" },
    { key: "sortOrder", label: "Sortierung", type: "number" },
  ],
  template: { slug: "", name: "", headline: "", intro: "", rule: {}, seo: { title: "", description: "" }, showInNav: true, sortOrder: 99 },
};

export const occasionSchema: EntitySchema = {
  collection: "occasions",
  slug: "anlaesse",
  idKey: "slug",
  labelKey: "name",
  singular: "Anlass",
  plural: "Anlässe",
  description: "Anlässe wie Geburtstag oder Danke – jeder hat eine eigene Seite.",
  sections: [
    {
      title: "Basis",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "slug", label: "Slug (URL)", type: "text", hint: "Leer lassen → wird aus dem Namen erzeugt.", placeholder: "wird automatisch erzeugt" },
        { key: "headline", label: "Überschrift", type: "text", required: true, span: "full" },
        { key: "intro", label: "Einleitung", type: "textarea", required: true, span: "full", rows: 3 },
        { key: "image", label: "Bild", type: "image", required: true },
        { key: "imageAlt", label: "Bild-Alternativtext", type: "text", required: true },
        { key: "featured", label: "Auf der Startseite / im Menü hervorheben", type: "boolean" },
        { key: "sortOrder", label: "Sortierung", type: "number", required: true, span: "third" },
      ],
    },
    seoSection("Anlassseite"),
  ],
  columns: [
    { key: "image", label: "", type: "image" },
    { key: "name", label: "Name" },
    { key: "slug", label: "Slug" },
    { key: "featured", label: "Hervorgehoben", type: "boolean" },
    { key: "sortOrder", label: "Sortierung", type: "number" },
  ],
  template: { slug: "", name: "", headline: "", intro: "", image: "", imageAlt: "", seo: { title: "", description: "" }, featured: true, sortOrder: 99 },
};

export const extraSchema: EntitySchema = {
  collection: "extras",
  slug: "extras",
  idKey: "id",
  labelKey: "name",
  singular: "Extra",
  plural: "Extras",
  description: "Zusatzprodukte wie Vase, Karte oder Schokolade.",
  sections: [
    {
      title: "Basis",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "slug", label: "Slug", type: "text", hint: "Leer lassen → wird aus dem Namen erzeugt.", placeholder: "wird automatisch erzeugt" },
        { key: "id", label: "ID", type: "text", hint: "Leer lassen → x-<slug>.", placeholder: "wird automatisch vergeben" },
        { key: "price", label: "Preis (€)", type: "number", required: true, step: 0.1, min: 0, span: "third" },
        { key: "description", label: "Beschreibung", type: "textarea", required: true, span: "full", rows: 2 },
        { key: "image", label: "Bild", type: "image", required: true },
        { key: "imageAlt", label: "Bild-Alternativtext", type: "text", required: true },
        { key: "active", label: "Aktiv", type: "boolean", span: "third" },
        { key: "showInCart", label: "Im Warenkorb vorschlagen", type: "boolean", span: "third" },
        { key: "sortOrder", label: "Sortierung", type: "number", required: true, span: "third" },
      ],
    },
  ],
  columns: [
    { key: "image", label: "", type: "image" },
    { key: "name", label: "Name" },
    { key: "price", label: "Preis", type: "price" },
    { key: "active", label: "Aktiv", type: "boolean" },
    { key: "showInCart", label: "Im Warenkorb", type: "boolean" },
    { key: "sortOrder", label: "Sortierung", type: "number" },
  ],
  template: { id: "", slug: "", name: "", description: "", price: 0, image: "", imageAlt: "", active: true, showInCart: true, sortOrder: 99 },
};

export const deliveryZoneSchema: EntitySchema = {
  collection: "delivery-zones",
  slug: "liefergebiete",
  idKey: "id",
  labelKey: "name",
  singular: "Liefergebiet",
  plural: "Liefergebiete",
  description: "Postleitzahlen, Gebühren, Liefertage, Fristen und Zeitfenster. Die Lieferlogik im Shop folgt ausschließlich diesen Angaben.",
  sections: [
    {
      title: "Basis",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "id", label: "ID", type: "text", hint: "Leer lassen → wird aus dem Namen erzeugt.", placeholder: "wird automatisch vergeben" },
        { key: "region", label: "Region", type: "text", required: true, placeholder: "Wien" },
        { key: "active", label: "Aktiv", type: "boolean" },
        { key: "postalCodes", label: "Postleitzahlen", type: "tags", required: true, span: "full", hint: "Einzelne PLZ oder Bereiche, mit Komma trennen: 1010-1090, 2340" },
        { key: "note", label: "Hinweis (wird Kund:innen angezeigt)", type: "textarea", span: "full", rows: 2 },
      ],
    },
    {
      title: "Kosten",
      fields: [
        { key: "fee", label: "Liefergebühr (€)", type: "number", required: true, step: 0.1, min: 0, span: "third" },
        { key: "freeFrom", label: "Gratis ab (€, leer = nie)", type: "number", nullable: true, step: 1, min: 0, span: "third" },
        { key: "minOrder", label: "Mindestbestellwert (€)", type: "number", required: true, step: 1, min: 0, span: "third" },
      ],
    },
    {
      title: "Liefertage & Fristen",
      fields: [
        { key: "deliveryDays", label: "Liefertage", type: "multiselect", options: WEEKDAY_OPTIONS, valueType: "number", span: "full" },
        { key: "cutoff", label: "Bestellschluss für den nächsten Liefertag", type: "time", required: true, span: "third" },
        { key: "leadDays", label: "Vorlauf in Tagen", type: "number", required: true, min: 0, span: "third", hint: "1 = Bestellung heute, Lieferung morgen." },
        { key: "sameDay", label: "Lieferung am selben Tag möglich", type: "boolean", span: "third" },
        { key: "sameDayCutoff", label: "Same-Day-Bestellschluss", type: "time", required: true, span: "third" },
      ],
    },
    {
      title: "Zeitfenster",
      fields: [
        {
          key: "windows", label: "Zeitfenster", type: "list", itemLabel: "Zeitfenster", span: "full",
          fields: [
            { key: "id", label: "ID", type: "text", required: true, span: "third", placeholder: "am" },
            { key: "label", label: "Bezeichnung", type: "text", required: true, span: "third", placeholder: "9–13 Uhr" },
            { key: "surcharge", label: "Aufpreis (€)", type: "number", step: 0.1, min: 0, span: "third" },
            { key: "from", label: "Von", type: "time", required: true, span: "third" },
            { key: "to", label: "Bis", type: "time", required: true, span: "third" },
            { key: "active", label: "Aktiv", type: "boolean", span: "third" },
          ],
        },
      ],
    },
  ],
  columns: [
    { key: "name", label: "Name" },
    { key: "region", label: "Region" },
    { key: "postalCodes", label: "PLZ", type: "list" },
    { key: "fee", label: "Gebühr", type: "price" },
    { key: "sameDay", label: "Same-Day", type: "boolean" },
    { key: "active", label: "Aktiv", type: "boolean" },
  ],
  template: {
    id: "", name: "", region: "Wien", postalCodes: [], fee: 7.9, freeFrom: null, minOrder: 0,
    deliveryDays: [1, 2, 3, 4, 5, 6], cutoff: "14:00", leadDays: 1, sameDay: false, sameDayCutoff: "12:00",
    windows: [{ id: "day", label: "9–18 Uhr", from: "09:00", to: "18:00", surcharge: 0, active: true }], active: true,
  },
};

export const couponSchema: EntitySchema = {
  collection: "coupons",
  slug: "gutscheine",
  idKey: "code",
  labelKey: "code",
  singular: "Gutschein",
  plural: "Gutscheine",
  description: "Rabattcodes für den Checkout.",
  sections: [
    {
      title: "Gutschein",
      fields: [
        { key: "code", label: "Code", type: "text", required: true, hint: "Wird in Großbuchstaben gespeichert." },
        { key: "type", label: "Art", type: "select", required: true, options: [
          { value: "percent", label: "Prozent" }, { value: "fixed", label: "Fester Betrag (€)" }, { value: "free_shipping", label: "Gratis Lieferung" },
        ] },
        { key: "value", label: "Wert", type: "number", required: true, min: 0, step: 0.1, span: "third", hint: "Prozent oder Euro; bei Gratis Lieferung 0." },
        { key: "minOrder", label: "Mindestbestellwert (€)", type: "number", required: true, min: 0, span: "third" },
        { key: "active", label: "Aktiv", type: "boolean", span: "third" },
        { key: "validFrom", label: "Gültig ab", type: "date", span: "third" },
        { key: "validUntil", label: "Gültig bis", type: "date", span: "third" },
        { key: "description", label: "Beschreibung (intern / Anzeige)", type: "text", span: "full" },
      ],
    },
  ],
  columns: [
    { key: "code", label: "Code" },
    { key: "type", label: "Art" },
    { key: "value", label: "Wert", type: "number" },
    { key: "minOrder", label: "Mindestbestellwert", type: "price" },
    { key: "validUntil", label: "Gültig bis", type: "date" },
    { key: "active", label: "Aktiv", type: "boolean" },
  ],
  template: { code: "", type: "percent", value: 10, minOrder: 0, active: true, description: "" },
};

export const faqSchema: EntitySchema = {
  collection: "faqs",
  slug: "faq",
  idKey: "id",
  labelKey: "question",
  singular: "FAQ",
  plural: "FAQ",
  description: "Häufige Fragen – erscheinen auf der FAQ-Seite, Startseite und Landingpages.",
  sections: [
    {
      title: "Frage",
      fields: [
        { key: "question", label: "Frage", type: "text", required: true, span: "full" },
        { key: "answer", label: "Antwort", type: "textarea", required: true, span: "full", rows: 5 },
        { key: "category", label: "Kategorie", type: "select", options: [
          { value: "lieferung", label: "Lieferung" }, { value: "bestellung", label: "Bestellung" }, { value: "produkt", label: "Produkt" },
        ] },
        { key: "sortOrder", label: "Sortierung", type: "number", required: true, span: "third" },
        { key: "id", label: "ID", type: "text", hint: "Leer lassen → wird automatisch vergeben.", placeholder: "wird automatisch vergeben" },
      ],
    },
  ],
  columns: [
    { key: "question", label: "Frage" },
    { key: "category", label: "Kategorie" },
    { key: "sortOrder", label: "Sortierung", type: "number" },
  ],
  template: { id: "", question: "", answer: "", category: "bestellung", sortOrder: 99 },
};

export const reviewSchema: EntitySchema = {
  collection: "reviews",
  slug: "bewertungen",
  idKey: "id",
  labelKey: "name",
  singular: "Bewertung",
  plural: "Bewertungen",
  description: "Demo-Bewertungen werden im Shop klar als solche gekennzeichnet.",
  sections: [
    {
      title: "Bewertung",
      fields: [
        { key: "name", label: "Name", type: "text", required: true, placeholder: "Katharina M." },
        { key: "rating", label: "Sterne", type: "select", required: true, valueType: "number", options: [
          { value: "5", label: "5" }, { value: "4", label: "4" }, { value: "3", label: "3" }, { value: "2", label: "2" }, { value: "1", label: "1" },
        ], span: "third" },
        { key: "text", label: "Text", type: "textarea", required: true, span: "full", rows: 4 },
        { key: "productSlug", label: "Produkt (optional)", type: "select", optionsFrom: "products" },
        { key: "date", label: "Datum", type: "date", required: true, span: "third" },
        { key: "verified", label: "Verifizierter Kauf", type: "boolean", span: "third" },
        { key: "demo", label: "Demo-Bewertung", type: "boolean", span: "third" },
        { key: "id", label: "ID", type: "text", hint: "Leer lassen → wird automatisch vergeben.", placeholder: "wird automatisch vergeben" },
      ],
    },
  ],
  columns: [
    { key: "name", label: "Name" },
    { key: "rating", label: "Sterne", type: "rating" },
    { key: "productSlug", label: "Produkt" },
    { key: "date", label: "Datum", type: "date" },
    { key: "verified", label: "Verifiziert", type: "boolean" },
    { key: "demo", label: "Demo", type: "boolean" },
  ],
  template: { id: "", name: "", rating: 5, text: "", verified: true, date: "", demo: false },
};

export const landingPageSchema: EntitySchema = {
  collection: "landing-pages",
  slug: "landingpages",
  idKey: "slug",
  labelKey: "title",
  singular: "Landingpage",
  plural: "Landingpages",
  description: "SEO-Seiten mit Produktauswahl, Textabschnitten und FAQ.",
  removeEmptyObjectsAt: ["sections.*.image"],
  sections: [
    {
      title: "Basis",
      fields: [
        { key: "title", label: "Titel", type: "text", required: true },
        { key: "slug", label: "Slug (URL)", type: "text", hint: "Leer lassen → wird aus dem Titel erzeugt.", placeholder: "wird automatisch erzeugt" },
        { key: "headline", label: "Überschrift", type: "text", required: true, span: "full" },
        { key: "intro", label: "Einleitung", type: "textarea", required: true, span: "full", rows: 3 },
        { key: "image", label: "Bild", type: "image" },
      ],
    },
    {
      title: "Produktauswahl",
      fields: [
        { key: "productFilter.occasions", label: "Anlässe", type: "multiselect", optionsFrom: "occasions", span: "full" },
        { key: "productFilter.category", label: "Kategorie", type: "select", optionsFrom: "categories" },
        { key: "productFilter.limit", label: "Maximale Anzahl", type: "number", min: 1, span: "third" },
        { key: "productFilter.sameDayOnly", label: "Nur Same-Day-fähige Produkte", type: "boolean", span: "third" },
      ],
    },
    { title: "Inhalt", fields: [richSectionsField()] },
    { title: "FAQ", fields: [{ key: "faqIds", label: "Fragen", type: "multiselect", optionsFrom: "faqs", ordered: true, span: "full" }] },
    seoSection("Landingpage"),
  ],
  columns: [
    { key: "title", label: "Titel" },
    { key: "slug", label: "Slug" },
    { key: "headline", label: "Überschrift" },
  ],
  template: { slug: "", title: "", headline: "", intro: "", productFilter: { limit: 8 }, sections: [], faqIds: [], seo: { title: "", description: "" } },
};

export const pageSchema: EntitySchema = {
  collection: "pages",
  slug: "seiten",
  idKey: "slug",
  labelKey: "title",
  singular: "Seite",
  plural: "Seiten",
  description: "Über uns, Lieferung, Kontakt und rechtliche Seiten. Platzhalter sind im Shop markiert.",
  removeEmptyObjectsAt: ["sections.*.image"],
  sections: [
    {
      title: "Basis",
      fields: [
        { key: "title", label: "Titel", type: "text", required: true },
        { key: "slug", label: "Slug (URL)", type: "text", required: true, hint: "Bestehende Slugs (impressum, agb, …) sind im Shop verlinkt – nicht ändern." },
        { key: "intro", label: "Einleitung", type: "textarea", span: "full", rows: 3 },
        { key: "placeholder", label: "Seite ist noch ein Platzhalter", type: "boolean", span: "full" },
      ],
    },
    { title: "Inhalt", fields: [richSectionsField()] },
    seoSection("Seite"),
  ],
  columns: [
    { key: "title", label: "Titel" },
    { key: "slug", label: "Slug" },
    { key: "placeholder", label: "Platzhalter", type: "boolean" },
  ],
  template: { slug: "", title: "", sections: [], seo: { title: "", description: "" } },
};

export const ENTITY_SCHEMAS: EntitySchema[] = [
  productSchema, categorySchema, occasionSchema, extraSchema, deliveryZoneSchema,
  couponSchema, faqSchema, reviewSchema, landingPageSchema, pageSchema,
];

export function schemaBySlug(slug: string) {
  return ENTITY_SCHEMAS.find((s) => s.slug === slug) ?? null;
}
export function schemaByCollection(collection: string) {
  return ENTITY_SCHEMAS.find((s) => s.collection === collection) ?? null;
}

/* ---------------- singletons ---------------- */

const cta = (key: string, label: string): FieldDef[] => [
  { key: `${key}.label`, label: `${label} – Text`, type: "text", required: true },
  { key: `${key}.href`, label: `${label} – Link`, type: "text", required: true, placeholder: "/blumen" },
];

export const settingsSchema: SingletonSchema = {
  collection: "settings",
  slug: "einstellungen",
  title: "Einstellungen",
  description: "Marke, Kontakt, Funktionen, Sperrtage, Zahlungsarten und Bestellstatus.",
  sections: [
    {
      title: "Marke & Kontakt",
      fields: [
        { key: "brand.name", label: "Markenname", type: "text", required: true },
        { key: "brand.claim", label: "Claim", type: "text", required: true },
        { key: "brand.legalName", label: "Firmenname (rechtlich)", type: "text", required: true, span: "full" },
        { key: "brand.email", label: "E-Mail", type: "text", required: true },
        { key: "brand.phone", label: "Telefon", type: "text", required: true },
        { key: "brand.address.street", label: "Straße & Hausnummer", type: "text", required: true, span: "full" },
        { key: "brand.address.zip", label: "PLZ", type: "text", required: true, span: "third" },
        { key: "brand.address.city", label: "Ort", type: "text", required: true, span: "third" },
        { key: "brand.address.country", label: "Land", type: "text", required: true, span: "third" },
        { key: "brand.openingHours", label: "Öffnungszeiten", type: "lines", span: "full", rows: 3, hint: "Eine Zeile pro Eintrag." },
        { key: "brand.social.instagram", label: "Instagram", type: "text" },
        { key: "brand.social.facebook", label: "Facebook", type: "text" },
        { key: "brand.social.pinterest", label: "Pinterest", type: "text" },
        { key: "brand.social.tiktok", label: "TikTok", type: "text" },
      ],
    },
    {
      title: "Ankündigungsleiste",
      fields: [
        { key: "announcement.enabled", label: "Leiste anzeigen", type: "boolean", span: "full" },
        { key: "announcement.messages", label: "Nachrichten", type: "lines", span: "full", rows: 3, hint: "Eine Nachricht pro Zeile – sie wechseln automatisch." },
      ],
    },
    {
      title: "Funktionen",
      fields: [
        { key: "sameDayEnabled", label: "Same-Day-Lieferung aktiv", type: "boolean", span: "third" },
        { key: "subscriptionEnabled", label: "Blumen-Abo aktiv", type: "boolean", span: "third" },
        { key: "newsletterEnabled", label: "Newsletter aktiv", type: "boolean", span: "third" },
        { key: "favoritesEnabled", label: "Merkliste aktiv", type: "boolean", span: "third" },
        { key: "headerCta.enabled", label: "Button im Header anzeigen", type: "boolean", span: "third" },
        { key: "headerCta.label", label: "Header-Button – Text", type: "text", required: true, span: "third" },
        { key: "headerCta.href", label: "Header-Button – Link", type: "text", required: true, span: "third" },
        { key: "greetingCard.maxChars", label: "Grußkarte – max. Zeichen", type: "number", required: true, min: 20, span: "third" },
        { key: "greetingCard.freeCardIncluded", label: "Gratis-Karte inklusive", type: "boolean", span: "third" },
        { key: "timezone", label: "Zeitzone", type: "text", required: true, span: "third", hint: "z. B. Europe/Vienna" },
      ],
    },
    {
      title: "Sperrtage",
      description: "An diesen Tagen wird nicht geliefert (Feiertage, Urlaub).",
      fields: [{ key: "blackoutDates", label: "Sperrtage", type: "stringlist", itemType: "date", span: "full" }],
    },
    {
      title: "Zahlungsarten",
      fields: [
        {
          key: "payments", label: "Zahlungsarten", type: "list", itemLabel: "Zahlungsart", fixedLength: true, span: "full",
          fields: [
            { key: "id", label: "ID", type: "text", readonly: true, span: "third" },
            { key: "label", label: "Bezeichnung", type: "text", required: true, span: "third" },
            { key: "provider", label: "Anbieter", type: "select", span: "third", options: [
              { value: "mock", label: "Mock (Test)" }, { value: "stripe", label: "Stripe" }, { value: "paypal", label: "PayPal" }, { value: "klarna", label: "Klarna" },
            ] },
            { key: "enabled", label: "Aktiv", type: "boolean", span: "full" },
          ],
        },
      ],
    },
    {
      title: "Bestellstatus",
      description: "Bezeichnungen und Beschreibungen, die Kund:innen in der Sendungsverfolgung sehen.",
      fields: [
        {
          key: "orderStatuses", label: "Status", type: "list", itemLabel: "Status", fixedLength: true, span: "full",
          fields: [
            { key: "key", label: "Schlüssel", type: "text", readonly: true, span: "third" },
            { key: "label", label: "Bezeichnung", type: "text", required: true, span: "third" },
            { key: "customerVisible", label: "Für Kund:innen sichtbar", type: "boolean", span: "third" },
            { key: "description", label: "Beschreibung", type: "text", required: true, span: "full" },
            { key: "terminal", label: "Endstatus", type: "boolean", span: "third" },
          ],
        },
      ],
    },
    {
      title: "SEO-Standards",
      fields: [
        { key: "seo.siteUrl", label: "Website-URL", type: "text", required: true, placeholder: "https://boquetterie.at" },
        { key: "seo.defaultTitle", label: "Standard-Titel", type: "text", required: true },
        { key: "seo.defaultDescription", label: "Standard-Beschreibung", type: "textarea", required: true, span: "full", rows: 3 },
      ],
    },
    {
      title: "Vertrauenselemente",
      description: "Kurze Versprechen, die auf Produktseiten und im Checkout erscheinen. Icons: leaf, truck, calendar, mail, heart, star.",
      fields: [
        {
          key: "trust", label: "Elemente", type: "list", itemLabel: "Element", span: "full",
          fields: [
            { key: "icon", label: "Icon", type: "text", required: true, span: "third" },
            { key: "title", label: "Titel", type: "text", required: true, span: "third" },
            { key: "text", label: "Text", type: "text", required: true, span: "third" },
          ],
        },
      ],
    },
  ],
};

export const homepageSchema: SingletonSchema = {
  collection: "homepage",
  slug: "startseite",
  title: "Startseite",
  description: "Alle Abschnitte der Startseite – Texte, Bilder und Auswahl der gezeigten Inhalte.",
  sections: [
    {
      title: "Hero",
      fields: [
        { key: "hero.eyebrow", label: "Kleine Überzeile", type: "text", required: true },
        { key: "hero.headline", label: "Überschrift", type: "text", required: true },
        { key: "hero.subheadline", label: "Unterzeile", type: "textarea", required: true, span: "full", rows: 2 },
        ...cta("hero.primaryCta", "Hauptbutton"),
        ...cta("hero.secondaryCta", "Zweiter Button"),
        { key: "hero.imageWide", label: "Bild (Querformat)", type: "image", required: true },
        { key: "hero.imagePortrait", label: "Bild (Hochformat)", type: "image", required: true },
        { key: "hero.imageAlt", label: "Bild-Alternativtext", type: "text", required: true, span: "full" },
        { key: "hero.deliveryCheck.title", label: "PLZ-Check – Titel", type: "text", required: true, span: "third" },
        { key: "hero.deliveryCheck.placeholder", label: "PLZ-Check – Platzhalter", type: "text", required: true, span: "third" },
        { key: "hero.deliveryCheck.button", label: "PLZ-Check – Button", type: "text", required: true, span: "third" },
      ],
    },
    {
      title: "Anlässe",
      fields: [
        { key: "occasions.headline", label: "Überschrift", type: "text", required: true },
        { key: "occasions.subheadline", label: "Unterzeile", type: "text", required: true },
        { key: "occasions.slugs", label: "Gezeigte Anlässe", type: "multiselect", optionsFrom: "occasions", ordered: true, span: "full" },
      ],
    },
    {
      title: "Bestseller",
      fields: [
        { key: "bestsellers.headline", label: "Überschrift", type: "text", required: true },
        { key: "bestsellers.subheadline", label: "Unterzeile", type: "text", required: true },
        { key: "bestsellers.productSlugs", label: "Gezeigte Produkte", type: "multiselect", optionsFrom: "products", ordered: true, span: "full" },
      ],
    },
    {
      title: "Kollektionen",
      fields: [
        { key: "collections.headline", label: "Überschrift", type: "text", required: true },
        { key: "collections.subheadline", label: "Unterzeile", type: "text", required: true },
        { key: "collections.slugs", label: "Gezeigte Kategorien", type: "multiselect", optionsFrom: "categories", ordered: true, span: "full" },
      ],
    },
    {
      title: "So funktioniert’s",
      fields: [
        { key: "howItWorks.headline", label: "Überschrift", type: "text", required: true, span: "full" },
        {
          key: "howItWorks.steps", label: "Schritte", type: "list", itemLabel: "Schritt", span: "full",
          fields: [
            { key: "title", label: "Titel", type: "text", required: true, span: "third" },
            { key: "icon", label: "Icon", type: "text", required: true, span: "third", hint: "flower, pen, calendar, truck" },
            { key: "text", label: "Text", type: "text", required: true, span: "full" },
          ],
        },
      ],
    },
    {
      title: "Saisonal",
      fields: [
        { key: "seasonal.eyebrow", label: "Kleine Überzeile", type: "text", required: true },
        { key: "seasonal.headline", label: "Überschrift", type: "text", required: true },
        { key: "seasonal.text", label: "Text", type: "textarea", required: true, span: "full", rows: 3 },
        ...cta("seasonal.cta", "Button"),
        { key: "seasonal.image", label: "Bild", type: "image", required: true },
        { key: "seasonal.imageAlt", label: "Bild-Alternativtext", type: "text", required: true },
        { key: "seasonal.productSlugs", label: "Gezeigte Produkte", type: "multiselect", optionsFrom: "products", ordered: true, span: "full" },
      ],
    },
    {
      title: "Editorial",
      fields: [
        { key: "editorial.eyebrow", label: "Kleine Überzeile", type: "text", required: true },
        { key: "editorial.headline", label: "Überschrift", type: "text", required: true },
        { key: "editorial.text", label: "Text", type: "textarea", required: true, span: "full", rows: 3 },
        ...cta("editorial.cta", "Button"),
        { key: "editorial.image", label: "Bild", type: "image", required: true },
        { key: "editorial.imageAlt", label: "Bild-Alternativtext", type: "text", required: true },
      ],
    },
    {
      title: "Extras",
      fields: [
        { key: "extras.headline", label: "Überschrift", type: "text", required: true },
        { key: "extras.subheadline", label: "Unterzeile", type: "text", required: true },
      ],
    },
    {
      title: "Blumen-Abo",
      fields: [
        { key: "subscription.headline", label: "Überschrift", type: "text", required: true },
        { key: "subscription.text", label: "Text", type: "textarea", required: true, span: "full", rows: 2 },
        ...cta("subscription.cta", "Button"),
      ],
    },
    {
      title: "Bewertungen",
      fields: [
        { key: "reviews.headline", label: "Überschrift", type: "text", required: true },
        { key: "reviews.subheadline", label: "Unterzeile", type: "text", required: true },
      ],
    },
    {
      title: "Galerie",
      fields: [
        { key: "gallery.headline", label: "Überschrift", type: "text", required: true, span: "full" },
        {
          key: "gallery.images", label: "Bilder", type: "list", itemLabel: "Bild", span: "full",
          fields: [
            { key: "src", label: "Bildpfad", type: "image", required: true },
            { key: "alt", label: "Alternativtext", type: "text", required: true },
          ],
        },
      ],
    },
    {
      title: "FAQ",
      fields: [
        { key: "faq.headline", label: "Überschrift", type: "text", required: true, span: "full" },
        { key: "faq.ids", label: "Gezeigte Fragen", type: "multiselect", optionsFrom: "faqs", ordered: true, span: "full" },
      ],
    },
    {
      title: "Newsletter",
      fields: [
        { key: "newsletter.headline", label: "Überschrift", type: "text", required: true },
        { key: "newsletter.text", label: "Text", type: "text", required: true },
        { key: "newsletter.placeholder", label: "Platzhalter im Feld", type: "text", required: true, span: "third" },
        { key: "newsletter.button", label: "Button", type: "text", required: true, span: "third" },
        { key: "newsletter.note", label: "Hinweis (Datenschutz)", type: "textarea", required: true, span: "full", rows: 2 },
      ],
    },
  ],
};

export const subscriptionSchema: SingletonSchema = {
  collection: "subscription",
  slug: "blumen-abo",
  title: "Blumen-Abo",
  description: "Pläne, Rhythmen und Texte der Abo-Seite.",
  sections: [
    {
      title: "Allgemein",
      fields: [
        { key: "enabled", label: "Abo-Seite aktiv", type: "boolean", span: "full" },
        { key: "headline", label: "Überschrift", type: "text", required: true },
        { key: "image", label: "Bild", type: "image", required: true },
        { key: "intro", label: "Einleitung", type: "textarea", required: true, span: "full", rows: 3 },
        { key: "audiences", label: "Zielgruppen", type: "lines", span: "full", rows: 3, hint: "Eine pro Zeile, z. B. Zuhause, Büro, Empfang." },
      ],
    },
    {
      title: "Pläne",
      fields: [
        {
          key: "plans", label: "Pläne", type: "list", itemLabel: "Plan", span: "full",
          fields: [
            { key: "id", label: "ID", type: "text", required: true, span: "third", placeholder: "small" },
            { key: "name", label: "Name", type: "text", required: true, span: "third" },
            { key: "price", label: "Preis pro Lieferung (€)", type: "number", required: true, step: 0.1, min: 0, span: "third" },
            { key: "stems", label: "Stiele", type: "text", required: true, span: "third", placeholder: "ca. 10–12 Stiele" },
            { key: "description", label: "Beschreibung", type: "text", required: true, span: "full" },
            { key: "popular", label: "Beliebtester Plan", type: "boolean", span: "third" },
          ],
        },
      ],
    },
    {
      title: "Rhythmen",
      fields: [
        {
          key: "frequencies", label: "Rhythmen", type: "list", itemLabel: "Rhythmus", span: "full",
          fields: [
            { key: "id", label: "ID", type: "text", required: true, span: "third", placeholder: "weekly" },
            { key: "label", label: "Bezeichnung", type: "text", required: true, span: "third" },
            { key: "discount", label: "Rabatt (%)", type: "number", required: true, min: 0, max: 100, span: "third" },
          ],
        },
      ],
    },
  ],
};

export const SINGLETON_SCHEMAS: SingletonSchema[] = [settingsSchema, homepageSchema, subscriptionSchema];

export function singletonByCollection(collection: string) {
  return SINGLETON_SCHEMAS.find((s) => s.collection === collection) ?? null;
}

/** All fields of a schema including list row fields (with `parent` for context). */
export function walkFields(sections: FieldSection[]): FieldDef[] {
  const out: FieldDef[] = [];
  const visit = (f: FieldDef) => {
    out.push(f);
    f.fields?.forEach(visit);
  };
  sections.forEach((s) => s.fields.forEach(visit));
  return out;
}

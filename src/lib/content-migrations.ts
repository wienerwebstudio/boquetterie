import { jsonStore, type DocumentStore } from "@/lib/store";
import { LANDING_PAGES_WAVE1 } from "@/lib/landing-pages-wave1";

/**
 * One-off, targeted changes to editorial content that already lives in the database.
 *
 * With Postgres, `/content/*.json` only seeds documents that are missing; a text
 * change in the repository never reaches a database that was seeded earlier. A
 * migration carries such a change: it replaces exact text passages (or drops exact
 * list values) and leaves everything else – including edits made in the admin –
 * untouched. Every step is idempotent: when the old text is gone, nothing happens.
 *
 * The repository's `/content` files already contain the result, so the JSON store
 * needs no migrations. Applied ids are kept in the data document `content-migrations`.
 */
export interface ContentMigration {
  id: string;
  /** Document name → exact text replacements, applied to every string in it. */
  replace?: Record<string, [from: string, to: string][]>;
  /** Document name → dotted path of a string list → values to drop from it. */
  removeValues?: Record<string, { path: string; values: string[] }[]>;
  /**
   * Pages (by slug) to copy from the repository's `content/pages.json` – only where the
   * stored page is still a placeholder (`placeholder: true`) or missing, never over real text.
   */
  pagesFromRepo?: string[];
  /** Document name → function that returns the changed document (same object when nothing changed). */
  transform?: Record<string, (doc: unknown) => unknown>;
}

export const CONTENT_MIGRATIONS: ContentMigration[] = [
  {
    // Greeting cards are switched off for now ("Kommt bald!") – no copy may promise one.
    id: "2026-11-16-greeting-cards-coming-soon",
    replace: {
      categories: [
        ["Wähle deinen Strauß, bestimme das Lieferdatum und schreib ein paar Worte für die Karte.", "Wähle deinen Strauß und bestimme das Lieferdatum."],
        ["Von Hand gebundene Sträuße, Wunschdatum, Grußkarte – Blumora.", "Von Hand gebundene Sträuße mit Wunschdatum – Blumora."],
        ["mit Wunschdatum und Grußkarte in Wien geliefert.", "mit Wunschdatum in Wien geliefert."],
        ["frisch gebunden, mit Grußkarte.", "frisch gebunden, mit Wunschdatum."],
        ["Blumenversand in Wien mit Wunschdatum und Grußkarte.", "Blumenversand in Wien mit Wunschdatum."],
      ],
      faqs: [
        [
          "Ja. Wähle bei der Grußkarte einfach „Ohne Absender senden“. Die Rechnung geht nur an dich, die Karte trägt nur deine Nachricht.",
          "Ja. Ohne Grußkarte steht dein Name nirgends am Strauß, und die Rechnung geht nur an dich. Grußkarten mit persönlicher Nachricht kommen bald.",
        ],
        [
          "Ja. Zu jedem Strauß gehört eine Grußkarte mit deiner persönlichen Nachricht. Du siehst beim Schreiben eine Vorschau der Karte.",
          "Noch nicht – Grußkarten kommen bald. Bis dahin wird der Strauß ohne Karte geliefert.",
        ],
        ["können wir Lieferdatum, Adresse oder Kartentext meist noch anpassen.", "können wir Lieferdatum oder Adresse meist noch anpassen."],
      ],
      homepage: [["Wähle Größe, Grußkarte und kleine Extras.", "Wähle Größe und kleine Extras."]],
      "landing-pages": [
        ["Wähle deinen Strauß, bestimme das Lieferdatum und schreib ein paar Worte für die Karte.", "Wähle deinen Strauß und bestimme das Lieferdatum."],
        ["mit Wunschdatum, Zeitfenster und Grußkarte.", "mit Wunschdatum und Zeitfenster."],
        ["Du wählst Strauß und Tag und schreibst die Karte.", "Du wählst Strauß und Tag."],
        ["Karte und Lieferkosten", "Lieferkosten"],
        ["Zu jedem Strauß gehört eine Grußkarte mit deinem Text. Die Liefergebühr", "Die Liefergebühr"],
        ["Zeitfenster bestimmen, Grußkarte schreiben.", "Zeitfenster bestimmen."],
        [" Eine Grußkarte mit deinem Text ist dabei.", ""],
        ["mit Wunschdatum, drei Zeitfenstern, Lieferkosten nach Bezirk und Grußkarte.", "mit Wunschdatum, drei Zeitfenstern und Lieferkosten nach Bezirk."],
      ],
      occasions: [
        ["Wähle Blumen und Wunschdatum und schreib eine persönliche Karte.", "Wähle Blumen und Wunschdatum."],
        ["mit Wunschdatum und persönlicher Grußkarte.", "mit Wunschdatum."],
        ["mit Grußkarte und Wunschdatum.", "mit Wunschdatum."],
        ["mit Wunschdatum und persönlicher Karte.", "mit Wunschdatum."],
        ["frisch gebunden, mit Grußkarte.", "frisch gebunden, mit Wunschdatum."],
      ],
      pages: [["Zu jedem Strauß gehört auf Wunsch eine Grußkarte mit deinem Text.", "Grußkarten mit deinem Text kommen bald."]],
      settings: [
        ["Wunschdatum wählen, Grußkarte schreiben, Freude schicken", "Wunschdatum wählen, Freude schicken"],
        ["Persönliche Grußkarte", "Grußkarten"],
        ["Deine Worte, unsere Karte", "Kommen bald"],
      ],
    },
    removeValues: { settings: [{ path: "announcement.messages", values: ["Grußkarte inklusive"] }] },
  },
  {
    // AGB, Datenschutzerklärung und Widerrufsbelehrung der Inhaber ersetzen die Platzhalter.
    id: "2026-11-16-legal-texts",
    pagesFromRepo: ["agb", "datenschutz", "widerruf"],
  },
  {
    // Inhaber: Same-Day in ganz Wien bis 19:00 Uhr, für alle Sträuße; Folgetage ohne Bestellschluss.
    id: "2026-11-16-same-day-until-19",
    replace: {
      faqs: [[
        "Derzeit liefern wir frühestens am nächsten Liefertag. Den frühesten Termin für deine Adresse siehst du, sobald du die Postleitzahl eingibst.",
        "Ja – bestellst du bis 19:00 Uhr, liefern wir noch am selben Tag (Montag bis Samstag) in ganz Wien. Den frühesten Termin für deine Adresse siehst du, sobald du die Postleitzahl eingibst.",
      ]],
    },
    transform: {
      settings: (doc) => setFields(doc, { sameDayEnabled: true }),
      "delivery-zones": (doc) =>
        mapList(doc, (z) => (typeof z.id === "string" && z.id.startsWith("wien-") ? setFields(z, { sameDay: true, sameDayCutoff: "19:00", cutoff: "23:59" }) : z)),
      products: (doc) => mapList(doc, (p) => setFields(p, { sameDayCapable: true })),
    },
  },
  {
    // Inhaber: Same-Day-Bestellschluss doch 18:30 Uhr.
    id: "2026-11-16-same-day-until-1830",
    replace: { faqs: [["Ja – bestellst du bis 19:00 Uhr,", "Ja – bestellst du bis 18:30 Uhr,"]] },
    transform: {
      "delivery-zones": (doc) =>
        mapList(doc, (z) => (typeof z.id === "string" && z.id.startsWith("wien-") && z.sameDayCutoff === "19:00" ? setFields(z, { sameDayCutoff: "18:30" }) : z)),
    },
  },
  {
    // Rose bouquets are priced per rose (owners' price calculation): S 9 · M 15 · L 25 · XL 41,
    // now also XXL 61 and XXXL 99. Other products keep their sizes.
    id: "2026-11-17-rose-sizes-xxl-xxxl",
    transform: { products: (doc) => mapList(doc, (p) => (ROSE_BOUQUET_IDS.includes(String(p.id)) ? withRoseSizes(p) : p)) },
  },
  {
    // One photo per size – never more roses on the photo than the size delivers.
    id: "2026-11-17-red-rose-size-photos",
    transform: { products: (doc) => mapList(doc, (p) => (p.id === "p-red-rose-bouquet" ? withSizeImages(p, RED_ROSE_SIZE_IMAGES) : p)) },
  },
  {
    // Klarna and EPS are active in Stripe, but were switched off in the shop settings.
    id: "2026-11-17-klarna-eps-via-stripe",
    transform: {
      settings: (doc) => {
        if (!doc || typeof doc !== "object" || !Array.isArray((doc as Obj).payments)) return doc;
        const payments = mapList((doc as Obj).payments, (m) => (m.id === "klarna" || m.id === "eps" ? setFields(m, { enabled: true, provider: "stripe" }) : m));
        return payments === (doc as Obj).payments ? doc : { ...(doc as Obj), payments };
      },
    },
  },
  {
    // Tulips and Advent wreaths come in several colours – the customer has to pick one.
    id: "2026-11-17-color-options",
    transform: { products: (doc) => mapList(doc, (p) => (COLOR_OPTIONS[String(p.id)] && !p.colorOptions ? { ...p, colorOptions: COLOR_OPTIONS[String(p.id)] } : p)) },
  },
  {
    // "EPS" means nothing to many customers – it is the online bank transfer.
    id: "2026-11-17-eps-label",
    transform: {
      settings: (doc) => {
        if (!doc || typeof doc !== "object" || !Array.isArray((doc as Obj).payments)) return doc;
        const payments = mapList((doc as Obj).payments, (m) => (m.id === "eps" && m.label === "EPS" ? setFields(m, { label: "Online-Überweisung (eps)" }) : m));
        return payments === (doc as Obj).payments ? doc : { ...(doc as Obj), payments };
      },
    },
  },
  {
    // Vienna: one-hour delivery windows from 9 to 22 instead of 9–12 / 12–17 / 17–22
    // (only zones still on exactly those three default windows).
    id: "2026-11-17-hourly-windows",
    transform: {
      "delivery-zones": (doc) => mapList(doc, (z) => (String(z.id).startsWith("wien-") && hasDefaultWindows(z.windows) ? { ...z, windows: HOURLY_WINDOWS } : z)),
    },
  },
  {
    // One photo per size for the other eleven rose bouquets – never more roses than the size delivers.
    id: "2026-11-17-rose-size-photos",
    transform: { products: (doc) => mapList(doc, (p) => (ROSE_SIZE_PHOTOS[String(p.id)] ? withSizeImages(p, ROSE_SIZE_PHOTOS[String(p.id)]) : p)) },
  },
  {
    // A close-up per size photo, so swiping through the gallery stays within the chosen size.
    id: "2026-11-17-rose-size-closeups",
    transform: { products: (doc) => mapList(doc, (p) => (ROSE_BOUQUET_IDS.includes(String(p.id)) ? withSizeCloseUps(p) : p)) },
  },
  {
    // Feedback: "mehr Blumen" on the start page – a fuller florist scene instead of one vase in an empty room.
    // The old loop showed the old bouquet, so it goes with it. Only if the admin has not chosen another image.
    id: "2026-11-17-hero-more-flowers",
    transform: {
      homepage: (doc) => {
        const hero = doc && typeof doc === "object" ? ((doc as Obj).hero as Obj | undefined) : undefined;
        if (!hero || hero.imageWide !== "/images/hero/hero-wide.jpg") return doc;
        const { video: _video, ...rest } = hero;
        void _video;
        return { ...(doc as Obj), hero: { ...rest, ...HERO_MORE_FLOWERS } };
      },
    },
  },
  {
    // Advent wreaths: lilac and beige re-shot flat on the sideboard (were tilted / seen from above);
    // drop the wreath hanging over the edge and the two tilted duplicates.
    id: "2026-11-17-advent-photos",
    transform: { products: (doc) => mapList(doc, (p) => (p.id === "p-adventskraenze" ? withReplacedImages(p, ADVENT_PHOTO_SWAP, ADVENT_PHOTO_DROP) : p)) },
  },
  {
    // Red Passion: a real second photo per size in a Vienna street instead of the cropped close-up
    // (small sizes held in a hand, large ones carried on a man's shoulder) – never more roses than delivered.
    id: "2026-11-17-red-passion-wien-photos",
    transform: { products: (doc) => mapList(doc, (p) => (p.id === "p-red-passion" ? withSecondPhotos(p, RED_PASSION_WIEN) : p)) },
  },
  {
    // No cropped "close-up" as second photo (it is only a zoom), and no second photo that shows clearly
    // fewer roses than the size delivers (Red Passion XL–XXXL). Second photos chosen in the admin stay.
    id: "2026-11-17-no-zoom-second-photos",
    transform: { products: (doc) => mapList(doc, (p) => (ROSE_BOUQUET_IDS.includes(String(p.id)) ? withoutZoomPhotos(p) : p)) },
  },
  {
    // Rose bouquets have six sizes since XXL/XXXL – texts and search snippets still said "vier Größen".
    id: "2026-11-17-rose-texts-six-sizes",
    transform: {
      products: (doc) => mapList(doc, (p) => {
        if (!ROSE_BOUQUET_IDS.includes(String(p.id))) return p;
        const json = JSON.stringify(p);
        const next = json.replaceAll("vier Größen", "sechs Größen");
        return next === json ? p : (JSON.parse(next) as Obj);
      }),
    },
  },
  {
    // Vienna now delivers on Sundays too; same-day order cutoff Mon–Sat 18:30, Sunday 17:45.
    id: "2026-11-17-sunday-delivery",
    replace: {
      faqs: [
        ["Ja – bestellst du bis 18:30 Uhr, liefern wir noch am selben Tag (Montag bis Samstag) in ganz Wien. Den frühesten Termin für deine Adresse siehst du, sobald du die Postleitzahl eingibst.", "Ja – bestellst du Montag bis Samstag bis 18:30 Uhr oder sonntags bis 17:45 Uhr, liefern wir noch am selben Tag in ganz Wien, solange ein Zeitfenster frei ist. Den frühesten Termin für deine Adresse siehst du, sobald du die Postleitzahl eingibst."],
        ["Ja. Im Checkout wählst du eines von drei Zeitfenstern: 9–12 Uhr, 12–17 Uhr oder 17–22 Uhr.", "Ja. In Wien wählst du im Checkout ein einstündiges Zeitfenster zwischen 9 und 22 Uhr – an allen sieben Tagen der Woche."],
      ],
      pages: [
        ["(3) Die regulären Liefertage sind Montag bis Samstag, soweit für die jeweilige Lieferadresse und das gewünschte Datum verfügbar.", "(3) Die regulären Liefertage sind Montag bis Sonntag, soweit für die jeweilige Lieferadresse und das gewünschte Datum verfügbar."],
        ["(4) Abhängig von der Lieferadresse können im Bestellprozess folgende Lieferzeitfenster angeboten werden:\n• 09:00 bis 12:00 Uhr\n• 12:00 bis 17:00 Uhr\n• 17:00 bis 22:00 Uhr", "(4) Abhängig von der Lieferadresse werden im Bestellprozess Lieferzeitfenster angeboten, in Wien derzeit einstündige Zeitfenster zwischen 09:00 und 22:00 Uhr."],
      ],
    },
    transform: {
      "delivery-zones": (doc) =>
        mapList(doc, (z) => {
          if (typeof z.id !== "string" || !z.id.startsWith("wien-") || !Array.isArray(z.deliveryDays)) return z;
          const days = z.deliveryDays as number[];
          const next = days.includes(0) ? z : { ...z, deliveryDays: [0, ...days] };
          return next.sameDayCutoffSunday ? next : { ...next, sameDayCutoffSunday: "17:45" };
        }),
    },
  },
  {
    // 38 new SEO landing pages (only slugs that are missing – pages edited in the admin stay),
    // plus the texts of the existing pages: hourly windows 9–22 Uhr, delivery Monday to Sunday,
    // six rose sizes.
    id: "2026-11-17-landing-pages-wave1",
    replace: {
      "landing-pages": [
        ["Als Zeitfenster stehen 9–12, 12–17 und 17–22 Uhr zur Wahl.", "Zur Wahl stehen einstündige Zeitfenster zwischen 9 und 22 Uhr."],
        ["eines von drei Zeitfenstern: 9–12, 12–17 oder 17–22 Uhr", "ein einstündiges Zeitfenster zwischen 9 und 22 Uhr"],
        ["mit Wunschdatum, drei Zeitfenstern und Lieferkosten nach Bezirk.", "mit Wunschdatum, stündlichen Zeitfenstern und Lieferkosten nach Bezirk."],
        [
          "Geliefert wird derzeit von Montag bis Samstag. Fällt der Geburtstag auf einen Sonntag, kannst du den Samstag davor wählen.",
          "Geliefert wird von Montag bis Sonntag – auch an einem Geburtstag am Wochenende kann der Strauß am Tag selbst ankommen.",
        ],
        ["Geliefert wird derzeit von Montag bis Samstag.", "Geliefert wird von Montag bis Sonntag."],
        ["derzeit von Montag bis Samstag", "von Montag bis Sonntag"],
        ["Die meisten Rosensträuße gibt es in den Größen Klein, Mittel, Groß und XL.", "Die meisten Rosensträuße gibt es in sechs Größen, von Klein mit 9 bis XXXL mit 99 Rosen."],
      ],
    },
    transform: { "landing-pages": (doc) => appendMissingBySlug(doc, LANDING_PAGES_WAVE1) },
  },
  {
    // Greeting cards are not available yet – search snippets must not promise a personal message.
    id: "2026-11-17-occasion-seo-no-card",
    replace: { occasions: [["frisch gebunden, mit persönlicher Nachricht.", "frisch gebunden, mit Wunschdatum."]] },
  },
  {
    // Datenschutz: section 13 now covers customer photos in reviews (request mail, consent, storage),
    // section 16 names Netlify Blobs. Only when section 13 still has the old wording.
    id: "2026-11-17-privacy-review-photos",
    replace: {
      pages: [["• Datenbank (Bestellungen, Kundenkonten, Anmeldungen):", "• Speicher für Bilder, auch Fotos aus Bewertungen: Netlify Blobs (Netlify, Inc., siehe oben), Region USA-Ost\n• Datenbank (Bestellungen, Kundenkonten, Anmeldungen, Bewertungen):"]],
    },
    transform: { pages: (doc) => mapList(doc, (p) => (p.slug === "datenschutz" ? withPrivacyReviewPhotos(p) : p)) },
  },
  {
    // Vienna street photo as second photo for the other rose bouquets (sizes whose photo matches the rose count).
    id: "2026-11-17-rose-wien-photos",
    transform: { products: (doc) => mapList(doc, (p) => (ROSE_WIEN_PHOTOS[String(p.id)] ? withSecondPhotos(p, roseWienPhotos(String(p.id))) : p)) },
  },
  {
    // Second round of Vienna photos (more M/L sizes after counting); same rule, adds only missing ones.
    id: "2026-11-17-rose-wien-photos-2",
    transform: { products: (doc) => mapList(doc, (p) => (ROSE_WIEN_PHOTOS[String(p.id)] ? withSecondPhotos(p, roseWienPhotos(String(p.id))) : p)) },
  },
  {
    // Rosenkuss M (last missing S/M/L Vienna photo).
    id: "2026-11-17-rose-wien-photos-3",
    transform: { products: (doc) => mapList(doc, (p) => (p.id === "p-rosenkuss" ? withSecondPhotos(p, roseWienPhotos("p-rosenkuss")) : p)) },
  },
];

/** Appends the pages whose slug is not in the stored list yet; same list when nothing is missing. */
export function appendMissingBySlug<T>(doc: T, pages: { slug: string }[]): T {
  if (!Array.isArray(doc)) return doc;
  const have = new Set(doc.map((p) => (p && typeof p === "object" ? (p as Obj).slug : undefined)));
  const missing = pages.filter((p) => !have.has(p.slug));
  return (missing.length ? [...doc, ...missing.map((p) => structuredClone(p))] : doc) as T;
}

const DROPPED_SECOND_PHOTOS = ["xl", "xxl", "xxxl"].map((id) => `/images/products/sortiment/red-passion-size-${id}-wien.jpg`);

function withoutZoomPhotos(product: Obj): Obj {
  if (!Array.isArray(product.sizes)) return product;
  let changed = false;
  const sizes = (product.sizes as Obj[]).map((s) => {
    const photo = typeof s.detailImage === "string" ? s.detailImage : "";
    if (!photo.endsWith("-nah.jpg") && !DROPPED_SECOND_PHOTOS.includes(photo)) return s;
    changed = true;
    const { detailImage: _photo, detailAlt: _alt, ...rest } = s;
    void _photo; void _alt;
    return rest;
  });
  return changed ? { ...product, sizes } : product;
}

const RED_PASSION_WIEN: Record<string, { image: string; alt: string }> = Object.fromEntries(
  ([
    ["s", "Red Passion Klein in der Hand, dahinter eine Wiener Straße mit Straßenbahn"],
    ["m", "Red Passion Mittel in der Hand, dahinter eine Wiener Straße mit Straßenbahn"],
    ["l", "Red Passion Groß in der Hand, dahinter eine Wiener Straße mit Straßenbahn"],
    ["xl", "Ein Mann trägt Red Passion XL auf der Schulter durch eine Wiener Straße mit Straßenbahn"],
    ["xxl", "Ein Mann trägt Red Passion XXL auf der Schulter durch eine Wiener Straße mit Straßenbahn"],
    ["xxxl", "Ein Mann trägt Red Passion XXXL auf der Schulter durch eine Wiener Straße mit Straßenbahn"],
  ] as const).map(([id, alt]) => [id, { image: `/images/products/sortiment/red-passion-size-${id}-wien.jpg`, alt }]),
);

/**
 * Vienna street photo per rose bouquet and size (bouquet held in a hand, tram behind). Only sizes whose
 * photo shows a rose count within the size's range (never more than delivered, at most a few fewer).
 */
export const ROSE_WIEN_PHOTOS: Record<string, { name: string; slug: string; sizes: ("s" | "m" | "l")[] }> = {
  "p-blackroses": { name: "Blackroses", slug: "blackroses", sizes: ["s", "m", "l"] },
  "p-blaueliebe": { name: "Blaue Liebe", slug: "blaueliebe", sizes: ["s", "m", "l"] },
  "p-rot-und-weiss-mix": { name: "Rot & Weiß Mix", slug: "rot-und-weiss-mix", sizes: ["s", "m", "l"] },
  "p-orange-bouquet": { name: "Orange Bouquet", slug: "orange-bouquet", sizes: ["s", "m", "l"] },
  "p-farbensinfonie": { name: "Farbensinfonie", slug: "farbensinfonie", sizes: ["s", "m", "l"] },
  "p-rosalie": { name: "Rosalie", slug: "rosalie", sizes: ["s", "m", "l"] },
  "p-red-rose-bouquet": { name: "Red Rose Bouquet", slug: "red-rose-bouquet", sizes: ["s", "m", "l"] },
  "p-klassiker-der-liebe": { name: "Klassiker der Liebe", slug: "klassiker-der-liebe", sizes: ["s", "m", "l"] },
  "p-koenigin-der-herzen": { name: "Königin der Herzen", slug: "koenigin-der-herzen", sizes: ["s", "m", "l"] },
  "p-rosenkuss": { name: "Rosenkuss", slug: "rosenkuss", sizes: ["s", "m", "l"] },
  "p-rosenglanz": { name: "Rosenglanz", slug: "rosenglanz", sizes: ["s", "m", "l"] },
};

const SIZE_LABEL = { s: "Klein", m: "Mittel", l: "Groß" } as const;

export function roseWienPhotos(productId: string): Record<string, { image: string; alt: string }> {
  const entry = ROSE_WIEN_PHOTOS[productId];
  if (!entry) return {};
  return Object.fromEntries(entry.sizes.map((id) => [id, {
    image: `/images/products/sortiment/${entry.slug}-size-${id}-wien.jpg`,
    alt: `${entry.name} ${SIZE_LABEL[id]} in der Hand, dahinter eine Wiener Straße mit Straßenbahn`,
  }]));
}

/** Second photo per size; replaces our cropped close-up, keeps a second photo chosen in the admin. */
function withSecondPhotos(product: Obj, photos: Record<string, { image: string; alt: string }>): Obj {
  if (!Array.isArray(product.sizes)) return product;
  let changed = false;
  const sizes = (product.sizes as Obj[]).map((s) => {
    const photo = photos[String(s.id)];
    const ours = !s.detailImage || (typeof s.detailImage === "string" && s.detailImage.endsWith("-nah.jpg"));
    if (!photo || !ours || s.detailImage === photo.image) return s;
    changed = true;
    return { ...s, detailImage: photo.image, detailAlt: photo.alt };
  });
  return changed ? { ...product, sizes } : product;
}

const ADVENT_PHOTO_SWAP: Record<string, string> = {
  "/images/products/sortiment/adventskraenze-3.jpg": "/images/products/sortiment/adventskraenze-lila.jpg",
  "/images/products/sortiment/adventskraenze-2.jpg": "/images/products/sortiment/adventskraenze-beige.jpg",
};
const ADVENT_PHOTO_DROP = ["7", "11", "12"].map((n) => `/images/products/sortiment/adventskraenze-${n}.jpg`);

/** Swaps photo paths in images and colour options and removes dropped photos; edited alts stay. */
function withReplacedImages(product: Obj, swap: Record<string, string>, drop: string[]): Obj {
  let changed = false;
  const fix = (src: unknown) => (typeof src === "string" && swap[src] ? ((changed = true), swap[src]) : src);
  const images = Array.isArray(product.images)
    ? (product.images as Obj[])
        .filter((i) => (drop.includes(String(i.src)) ? ((changed = true), false) : true))
        .map((i) => (typeof i.src === "string" && swap[i.src] ? { ...i, src: fix(i.src) } : i))
    : product.images;
  const colorOptions = Array.isArray(product.colorOptions)
    ? (product.colorOptions as Obj[]).map((c) => (typeof c.image === "string" && swap[c.image] ? { ...c, image: fix(c.image) } : c))
    : product.colorOptions;
  return changed ? { ...product, images, colorOptions } : product;
}

const HERO_MORE_FLOWERS = {
  imageWide: "/images/hero/hero-blumen-wide.jpg",
  imagePortrait: "/images/hero/hero-blumen-portrait.jpg",
  imageAlt: "Üppige Sträuße auf einer Eichenkommode in einem hellen Wiener Altbau: rosa und apricotfarbene Rosen mit Ranunkeln, rote Rosen in Seidenpapier, Tulpen und weiße Hortensien",
};

const ROSE_SIZE_PHOTOS: Record<string, Record<string, string>> = {
  "p-blackroses": { s: "/images/products/sortiment/blackroses-size-s.jpg", m: "/images/products/sortiment/blackroses-size-m.jpg", l: "/images/products/sortiment/blackroses-1.jpg", xl: "/images/products/sortiment/blackroses-size-xl.jpg", xxl: "/images/products/sortiment/blackroses-size-xxl.jpg", xxxl: "/images/products/sortiment/blackroses-size-xxxl.jpg" },
  "p-blaueliebe": { s: "/images/products/sortiment/blaueliebe-size-s.jpg", m: "/images/products/sortiment/blaueliebe-size-s.jpg", l: "/images/products/sortiment/blaueliebe-1.jpg", xl: "/images/products/sortiment/blaueliebe-size-xl.jpg", xxl: "/images/products/sortiment/blaueliebe-size-xxl.jpg", xxxl: "/images/products/sortiment/blaueliebe-size-xxxl.jpg" },
  "p-rot-und-weiss-mix": { s: "/images/products/sortiment/rot-und-weiss-mix-size-s.jpg", m: "/images/products/sortiment/rot-und-weiss-mix-size-m.jpg", l: "/images/products/sortiment/rot-und-weiss-mix-size-m.jpg", xl: "/images/products/sortiment/rot-und-weiss-mix-1.jpg", xxl: "/images/products/sortiment/rot-und-weiss-mix-4.jpg", xxxl: "/images/products/sortiment/rot-und-weiss-mix-size-xxxl.jpg" },
  "p-orange-bouquet": { s: "/images/products/sortiment/orange-bouquet-size-s.jpg", m: "/images/products/sortiment/orange-bouquet-size-m.jpg", l: "/images/products/sortiment/orange-bouquet-size-l.jpg", xl: "/images/products/sortiment/orange-bouquet-1.jpg", xxl: "/images/products/sortiment/orange-bouquet-size-xxl.jpg", xxxl: "/images/products/sortiment/orange-bouquet-size-xxxl.jpg" },
  "p-farbensinfonie": { s: "/images/products/sortiment/farbensinfonie-size-s.jpg", m: "/images/products/sortiment/farbensinfonie-size-m.jpg", l: "/images/products/sortiment/farbensinfonie-1.jpg", xl: "/images/products/sortiment/farbensinfonie-size-xl.jpg", xxl: "/images/products/sortiment/farbensinfonie-size-xxl.jpg", xxxl: "/images/products/sortiment/farbensinfonie-size-xxxl.jpg" },
  "p-rosalie": { s: "/images/products/sortiment/rosalie-size-s.jpg", m: "/images/products/sortiment/rosalie-1.jpg", l: "/images/products/sortiment/rosalie-size-l.jpg", xl: "/images/products/sortiment/rosalie-size-xl.jpg", xxl: "/images/products/sortiment/rosalie-size-xxl.jpg", xxxl: "/images/products/sortiment/rosalie-size-xxxl.jpg" },
  "p-red-passion": { s: "/images/products/sortiment/red-passion-size-s.jpg", m: "/images/products/sortiment/red-passion-size-m.jpg", l: "/images/products/sortiment/red-passion-size-l.jpg", xl: "/images/products/sortiment/red-passion-1.jpg", xxl: "/images/products/sortiment/red-passion-size-xxl.jpg", xxxl: "/images/products/sortiment/red-passion-3.jpg" },
  "p-klassiker-der-liebe": { s: "/images/products/sortiment/klassiker-der-liebe-size-s.jpg", m: "/images/products/sortiment/klassiker-der-liebe-size-m.jpg", l: "/images/products/sortiment/klassiker-der-liebe-size-l.jpg", xl: "/images/products/sortiment/klassiker-der-liebe-size-xl.jpg", xxl: "/images/products/sortiment/klassiker-der-liebe-size-xxl.jpg", xxxl: "/images/products/sortiment/klassiker-der-liebe-2.jpg" },
  "p-koenigin-der-herzen": { s: "/images/products/sortiment/koenigin-der-herzen-size-s.jpg", m: "/images/products/sortiment/koenigin-der-herzen-size-m.jpg", l: "/images/products/sortiment/koenigin-der-herzen-1.jpg", xl: "/images/products/sortiment/koenigin-der-herzen-size-xl.jpg", xxl: "/images/products/sortiment/koenigin-der-herzen-size-xxl.jpg", xxxl: "/images/products/sortiment/koenigin-der-herzen-size-xxxl.jpg" },
  "p-rosenkuss": { s: "/images/products/sortiment/rosenkuss-size-s.jpg", m: "/images/products/sortiment/rosenkuss-size-m.jpg", l: "/images/products/sortiment/rosenkuss-size-l.jpg", xl: "/images/products/sortiment/rosenkuss-size-l.jpg", xxl: "/images/products/sortiment/rosenkuss-3.jpg", xxxl: "/images/products/sortiment/rosenkuss-size-xxxl.jpg" },
  "p-rosenglanz": { s: "/images/products/sortiment/rosenglanz-size-s.jpg", m: "/images/products/sortiment/rosenglanz-size-m.jpg", l: "/images/products/sortiment/rosenglanz-size-l.jpg", xl: "/images/products/sortiment/rosenglanz-size-xl.jpg", xxl: "/images/products/sortiment/rosenglanz-1.jpg", xxxl: "/images/products/sortiment/rosenglanz-size-xxxl.jpg" },
};

const HOURLY_WINDOWS = Array.from({ length: 13 }, (_, i) => {
  const from = 9 + i;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { id: `h${pad(from)}`, label: `${from}–${from + 1} Uhr`, from: `${pad(from)}:00`, to: `${pad(from + 1)}:00`, surcharge: 0, active: true };
});

function hasDefaultWindows(windows: unknown) {
  if (!Array.isArray(windows) || windows.length !== 3) return false;
  return windows.map((w: Obj) => `${w.from}-${w.to}`).join(",") === "09:00-12:00,12:00-17:00,17:00-22:00";
}

const COLOR_OPTIONS: Record<string, { id: string; label: string; image: string }[]> = {
  "p-tulpenstrauss": [
    { id: "rot", label: "Rot", image: "/images/products/sortiment/tulpenstrauss-3.jpg" },
    { id: "gelb", label: "Gelb", image: "/images/products/sortiment/tulpenstrauss-1.jpg" },
    { id: "lila", label: "Lila", image: "/images/products/sortiment/tulpenstrauss-2.jpg" },
    { id: "rosa", label: "Rosa", image: "/images/products/sortiment/tulpenstrauss-5.jpg" },
    { id: "orange", label: "Orange", image: "/images/products/sortiment/tulpenstrauss-4.jpg" },
    { id: "weiss", label: "Weiß", image: "/images/products/sortiment/tulpenstrauss-7.jpg" },
    { id: "mix", label: "Bunter Mix", image: "/images/products/sortiment/tulpenstrauss-6.jpg" },
  ],
  "p-adventskraenze": [
    { id: "rot", label: "Rot", image: "/images/products/sortiment/adventskraenze-1.jpg" },
    { id: "grau", label: "Grau", image: "/images/products/sortiment/adventskraenze-8.jpg" },
    { id: "lila", label: "Lila", image: "/images/products/sortiment/adventskraenze-3.jpg" },
    { id: "gold", label: "Gold", image: "/images/products/sortiment/adventskraenze-4.jpg" },
    { id: "beige", label: "Beige", image: "/images/products/sortiment/adventskraenze-2.jpg" },
    { id: "weinrot", label: "Weinrot", image: "/images/products/sortiment/adventskraenze-6.jpg" },
    { id: "rosa", label: "Rosa", image: "/images/products/sortiment/adventskraenze-5.jpg" },
  ],
};

const RED_ROSE_SIZE_IMAGES: Record<string, string> = {
  s: "/images/products/sortiment/red-rose-bouquet-size-s.jpg",
  m: "/images/products/sortiment/red-rose-bouquet-size-m.jpg",
  l: "/images/products/sortiment/red-rose-bouquet-size-l.jpg",
  xl: "/images/products/sortiment/red-rose-bouquet-size-xl.jpg",
  xxl: "/images/products/sortiment/red-rose-bouquet-2.jpg",
  xxxl: "/images/products/sortiment/red-rose-bouquet-size-xxxl.jpg",
};

/** Sets the photo of each size that has none yet (a photo chosen in the admin stays). */
function withSizeImages(product: Obj, images: Record<string, string>): Obj {
  if (!Array.isArray(product.sizes)) return product;
  let changed = false;
  const sizes = (product.sizes as Obj[]).map((s) => {
    const image = images[String(s.id)];
    if (!image || s.image) return s;
    changed = true;
    return { ...s, image };
  });
  return changed ? { ...product, sizes } : product;
}

/** Our own size photos (not admin uploads) have a cropped close-up next to them: `<name>-nah.jpg`. */
const OWN_SIZE_PHOTO = /^\/images\/products\/sortiment\/[a-z0-9-]+\.jpg$/;

function withSizeCloseUps(product: Obj): Obj {
  if (!Array.isArray(product.sizes)) return product;
  let changed = false;
  const sizes = (product.sizes as Obj[]).map((s) => {
    if (s.detailImage || typeof s.image !== "string" || !OWN_SIZE_PHOTO.test(s.image)) return s;
    changed = true;
    return { ...s, detailImage: s.image.replace(/\.jpg$/, "-nah.jpg") };
  });
  return changed ? { ...product, sizes } : product;
}

/** Products whose sizes are a fixed number of roses. */
export const ROSE_BOUQUET_IDS = [
  "p-red-rose-bouquet", "p-blackroses", "p-blaueliebe", "p-rot-und-weiss-mix", "p-orange-bouquet", "p-farbensinfonie",
  "p-rosalie", "p-red-passion", "p-klassiker-der-liebe", "p-koenigin-der-herzen", "p-rosenkuss", "p-rosenglanz",
];
export const ROSE_SIZES: { id: string; label: string; price: number; stems: number }[] = [
  { id: "s", label: "Klein", price: 48.9, stems: 9 },
  { id: "m", label: "Mittel", price: 65.9, stems: 15 },
  { id: "l", label: "Groß", price: 93.9, stems: 25 },
  { id: "xl", label: "XL", price: 127.9, stems: 41 },
  { id: "xxl", label: "XXL", price: 175.9, stems: 61 },
  { id: "xxxl", label: "XXXL", price: 250.9, stems: 99 },
];

/** Adds the missing rose sizes and the rose count of existing ones; prices of existing sizes stay as edited. */
function withRoseSizes(product: Obj): Obj {
  if (!Array.isArray(product.sizes)) return product;
  let changed = false;
  const sizes = (product.sizes as Obj[]).map((s) => {
    const def = ROSE_SIZES.find((r) => r.id === s.id);
    if (!def || s.stems !== undefined) return s;
    changed = true;
    return { ...s, stems: def.stems };
  });
  for (const def of ROSE_SIZES) {
    if (sizes.some((s) => s.id === def.id)) continue;
    changed = true;
    sizes.push({ ...def });
  }
  return changed ? { ...product, sizes } : product;
}

type Obj = Record<string, unknown>;

const PRIVACY_REVIEWS_OLD = ["Nach einer Zustellung können Sie die gelieferten Blumen über einen Link aus Ihrer Bestellung bewerten. Dabei verarbeiten wir die Bestellnummer, die Bewertung, den Text und den angegebenen Namen.", "Bewertungen werden erst nach Prüfung und nur mit dem von Ihnen angegebenen Namen veröffentlicht. Rechtsgrundlage ist Ihre Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO, die Sie jederzeit unter office@blumora.at widerrufen können."];
const PRIVACY_REVIEWS_NEW: Obj = {"heading": "13. Bewertungen und Kundenfotos", "paragraphs": ["Nach einer Zustellung senden wir Ihnen einmalig eine E-Mail mit der Bitte um eine Bewertung. Rechtsgrundlage ist unser berechtigtes Interesse an Rückmeldungen zu unseren Leistungen (Art. 6 Abs. 1 lit. f DSGVO). Sie können dem jederzeit unter office@blumora.at widersprechen.", "Wenn Sie über den Link aus Ihrer Bestellung eine Bewertung abgeben, verarbeiten wir die Bestellnummer (zur Prüfung, dass die Bewertung zu einer tatsächlichen Bestellung gehört), die Sternebewertung, den Text, den angegebenen Namen sowie bis zu drei Fotos, die Sie freiwillig hochladen.", "Vor dem Speichern entfernen wir aus den Fotos Standort- und Kameradaten und verkleinern sie. Bitte laden Sie nur Fotos hoch, auf denen keine anderen Personen zu erkennen sind.", "Bewertung, Name und die von uns freigegebenen Fotos veröffentlichen wir auf blumora.at erst nach Prüfung und nur mit Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Die Einwilligung speichern wir mit Zeitpunkt und Wortlaut. Fotos, die wir nicht freigeben, werden gelöscht.", "Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft unter office@blumora.at widerrufen; Bewertung und Fotos werden dann entfernt.", "Die Fotos speichern wir bei Netlify (Netlify Blobs), die übrigen Angaben in unserer Datenbank bei Neon (siehe Abschnitte 16 und 17)."]};

function withPrivacyReviewPhotos(page: Obj): Obj {
  if (!Array.isArray(page.sections)) return page;
  let changed = false;
  const sections = (page.sections as Obj[]).map((sec) => {
    if (sec.heading !== "13. Bewertungen" || JSON.stringify(sec.paragraphs) !== JSON.stringify(PRIVACY_REVIEWS_OLD)) return sec;
    changed = true;
    return { ...sec, ...structuredClone(PRIVACY_REVIEWS_NEW) };
  });
  return changed ? { ...page, sections } : page;
}

/** Sets fields on an object; same object when every field already has that value. */
export function setFields<T>(doc: T, fields: Obj): T {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return doc;
  const o = doc as Obj;
  return Object.entries(fields).every(([k, v]) => o[k] === v) ? doc : ({ ...o, ...fields } as T);
}

/** Maps a list of objects; same list when no item changed. */
export function mapList<T>(doc: T, fn: (item: Obj) => Obj): T {
  if (!Array.isArray(doc)) return doc;
  let changed = false;
  const next = doc.map((item) => {
    if (!item || typeof item !== "object") return item;
    const r = fn(item as Obj);
    if (r !== item) changed = true;
    return r;
  });
  return (changed ? next : doc) as T;
}

type PageDoc = { slug: string; placeholder?: boolean }[];

/** Replaces placeholder (or missing) pages with the repository version. Same object when nothing changed. */
export function replacePlaceholderPages(stored: PageDoc, repo: PageDoc, slugs: string[]): PageDoc {
  let next = stored;
  for (const slug of slugs) {
    const fresh = repo.find((p) => p.slug === slug);
    if (!fresh) continue;
    const i = next.findIndex((p) => p.slug === slug);
    if (i === -1) next = [...next, fresh];
    else if (next[i].placeholder) next = next.map((p, j) => (j === i ? fresh : p));
  }
  return next;
}

/** Replaces the passages in every string of `value` (deep). Returns the same object when nothing changed. */
export function replaceTextDeep<T>(value: T, pairs: [string, string][]): T {
  if (typeof value === "string") {
    let s: string = value;
    for (const [from, to] of pairs) if (from && s.includes(from)) s = s.split(from).join(to);
    return (s === value ? value : s) as T;
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => {
      const r = replaceTextDeep(v, pairs);
      if (r !== v) changed = true;
      return r;
    });
    return (changed ? next : value) as T;
  }
  if (value && typeof value === "object") {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = replaceTextDeep(v, pairs);
      if (r !== v) changed = true;
      next[k] = r;
    }
    return (changed ? next : value) as T;
  }
  return value;
}

/** Drops exact values from the string list at `path`. Returns the same object when nothing changed. */
export function removeValuesAt<T>(doc: T, path: string, values: string[]): T {
  const keys = path.split(".");
  const walk = (node: unknown, i: number): unknown => {
    if (!node || typeof node !== "object") return node;
    if (i === keys.length - 1) {
      const list = (node as Record<string, unknown>)[keys[i]];
      if (!Array.isArray(list)) return node;
      const kept = list.filter((v) => !(typeof v === "string" && values.includes(v)));
      return kept.length === list.length ? node : { ...(node as object), [keys[i]]: kept };
    }
    const child = (node as Record<string, unknown>)[keys[i]];
    const next = walk(child, i + 1);
    return next === child ? node : { ...(node as object), [keys[i]]: next };
  };
  return walk(doc, 0) as T;
}

/** Applies one migration to one document; returns the same object when nothing changed. */
export function migrateDocument<T>(migration: ContentMigration, name: string, doc: T): T {
  let next = doc;
  const pairs = migration.replace?.[name];
  if (pairs) next = replaceTextDeep(next, pairs);
  for (const { path, values } of migration.removeValues?.[name] ?? []) next = removeValuesAt(next, path, values);
  const transform = migration.transform?.[name];
  if (transform) next = transform(next) as T;
  return next;
}

const APPLIED_DOC = "content-migrations";

/** Runs every migration that is not recorded as applied yet. Safe to run concurrently (idempotent steps). */
/** Returns the ids it applied (empty when nothing was pending). */
export async function runContentMigrations(store: DocumentStore, migrations = CONTENT_MIGRATIONS, repo: DocumentStore = jsonStore): Promise<string[]> {
  if (store.name === "json") return [];
  const applied = (await store.get<string[]>("data", APPLIED_DOC)) ?? [];
  const pending = migrations.filter((m) => !applied.includes(m.id));
  if (!pending.length) return [];
  for (const m of pending) {
    const names = new Set([...Object.keys(m.replace ?? {}), ...Object.keys(m.removeValues ?? {}), ...Object.keys(m.transform ?? {})]);
    for (const name of names) {
      const doc = await store.get<unknown>("content", name);
      if (doc === null) continue; // not seeded yet – it will be seeded from the already updated repository file
      const next = migrateDocument(m, name, doc);
      if (next !== doc) await store.set("content", name, next);
    }
    if (m.pagesFromRepo?.length) {
      const [stored, fromRepo] = await Promise.all([store.get<PageDoc>("content", "pages"), repo.get<PageDoc>("content", "pages")]);
      if (stored && fromRepo) {
        const next = replacePlaceholderPages(stored, fromRepo, m.pagesFromRepo);
        if (next !== stored) await store.set("content", "pages", next);
      }
    }
    applied.push(m.id);
    await store.set("data", APPLIED_DOC, applied);
    console.info(`[blumora] content migration applied: ${m.id}`);
  }
  return pending.map((m) => m.id);
}

/**
 * Plain-text descriptions of the shop for AI assistants and search engines
 * (`/llms.txt` = overview with links, `/llms-full.txt` = everything in one file).
 *
 * Built only from the live CMS content – no invented facts. Never includes
 * partner data, budgets, orders, customer data or placeholder text ("[…]").
 */
import type {
  Category, CmsPage, DeliveryZone, Extra, FAQ, LandingPage, Occasion, Product, Review, SiteSettings,
} from "@/types";
import { COLOR_OPTIONS, STYLE_OPTIONS } from "@/lib/catalog";
import { routes } from "@/lib/urls";
import { VAT_TEXT } from "@/lib/vat";
import { profileLinks, whatsappSupport } from "@/lib/social";

export interface LlmsData {
  settings: SiteSettings;
  products: Product[];
  categories: Category[];
  occasions: Occasion[];
  extras: Extra[];
  zones: DeliveryZone[];
  faqs: FAQ[];
  reviews: Review[];
  landingPages: LandingPage[];
  pages: CmsPage[];
}

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const SEASONS: Record<string, string> = { fruehling: "Frühling", sommer: "Sommer", herbst: "Herbst", winter: "Winter", ganzjaehrig: "ganzjährig" };

const eur = (v: number) => `${v.toFixed(2).replace(".", ",")} €`;
/** True for operator placeholders such as "[Firmenname]" – never shown to AI crawlers. */
const isPlaceholder = (v: string | undefined | null) => !v || /\[[^\]]*\]|…\]/.test(v);
const clean = (v: string) => v.replace(/\s+/g, " ").trim();
const label = (list: readonly { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? v;

function pagePlaceholder(p: CmsPage) {
  return Boolean(p.placeholder || (p.sections.length > 0 && p.sections.every((s) => s.placeholder)));
}

function weekdayRange(days: number[]) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return "Montag bis Sonntag";
  return sorted.map((d) => WEEKDAYS[d]).join(", ");
}

function publicReviews(reviews: Review[]) {
  return reviews.filter((r) => r.verified && !r.demo).sort((a, b) => b.date.localeCompare(a.date));
}

function ctx(data: LlmsData) {
  const base = data.settings.seo.siteUrl.replace(/\/$/, "");
  const abs = (path: string) => `${base}${path === "/" ? "" : path}`;
  const products = data.products.filter((p) => p.active);
  const occasionName = (slug: string) => data.occasions.find((o) => o.slug === slug)?.name ?? slug;
  const zones = data.zones.filter((z) => z.active);
  return { base, abs, products, occasionName, zones, brand: data.settings.brand };
}

function contactLines(data: LlmsData): string[] {
  const { brand } = data.settings;
  const lines: string[] = [];
  if (!isPlaceholder(brand.email)) lines.push(`- E-Mail: ${brand.email}`);
  if (!isPlaceholder(brand.phone)) lines.push(`- Telefon: ${brand.phone}`);
  const wa = whatsappSupport(data.settings);
  if (wa) lines.push(`- WhatsApp${wa.is247 ? " (rund um die Uhr)" : ""}: ${wa.href}`);
  for (const p of profileLinks(data.settings)) lines.push(`- ${p.name}: ${p.href}`);
  return lines;
}

function deliverySummary(data: LlmsData): string[] {
  const { zones } = ctx(data);
  const out: string[] = [];
  const vienna = zones.filter((z) => z.region === "Wien");
  if (vienna.length) {
    const days = weekdayRange(vienna.flatMap((z) => z.deliveryDays));
    out.push(`- Liefergebiet: Wien (${vienna.flatMap((z) => z.postalCodes).length} Postleitzahlen)${zones.some((z) => z.region !== "Wien") ? " und Umgebung" : ""}.`);
    out.push(`- Liefertage in Wien: ${days}.`);
    const fees = [...new Set(vienna.map((z) => z.fee))].sort((a, b) => a - b);
    out.push(`- Liefergebühr in Wien je nach Bezirk: ${fees.map((f) => (f === 0 ? "kostenlos" : eur(f))).join(" / ")}.`);
    const sameDay = data.settings.sameDayEnabled ? vienna.filter((z) => z.sameDay) : [];
    if (sameDay.length) {
      const z = sameDay[0];
      out.push(`- Lieferung am selben Tag (Same-Day) in Wien: Bestellung bis ${z.sameDayCutoff} Uhr${z.sameDayCutoffSunday && z.sameDayCutoffSunday !== z.sameDayCutoff ? ` (sonntags bis ${z.sameDayCutoffSunday} Uhr)` : ""}; wählbar sind Zeitfenster, die frühestens zwei Stunden nach der Bestellung enden.`);
    }
    const windows = vienna[0].windows.filter((w) => w.active);
    if (windows.length) out.push(`- Zeitfenster: ${windows.length > 4 ? `stündlich von ${windows[0].from} bis ${windows[windows.length - 1].to} Uhr` : windows.map((w) => w.label).join(", ")}.`);
  }
  return out;
}

/** `/llms.txt` – short overview with the most important links (llmstxt.org format). */
export function buildLlmsTxt(data: LlmsData): string {
  const { abs, products, brand } = ctx(data);
  const prices = products.filter((p) => !p.pricePending).flatMap((p) => p.sizes.map((s) => s.price));
  const lines: string[] = [
    `# ${brand.name}`,
    "",
    `> ${clean(data.settings.seo.defaultDescription)}`,
    "",
    `${brand.name} ist ein Online-Blumenversand für Wien (${abs("/")}). ${clean(brand.claim)} Jeder Strauß wird für die jeweilige Bestellung in Wien von Hand gebunden und per Kurier zugestellt.`,
    "",
    "## Auf einen Blick",
    "",
    ...deliverySummary(data),
    ...(prices.length ? [`- Sortiment: ${products.length} Sträuße und Blumengeschenke, Preise von ${eur(Math.min(...prices))} bis ${eur(Math.max(...prices))}.`] : []),
    `- Bezahlung: ${data.settings.payments.filter((p) => p.enabled).map((p) => p.label).join(", ")}.`,
    ...contactLines(data),
    "",
    "## Ausführlich",
    "",
    `- [Alle Informationen in einer Datei](${abs("/llms-full.txt")}): Sortiment mit Preisen, Liefergebiete mit Postleitzahlen, Häufige Fragen, Anlässe.`,
    "",
    "## Wichtige Seiten",
    "",
    `- [Alle Blumen](${abs(routes.shop)}): Sortiment mit Filtern nach Anlass, Farbe und Preis`,
    `- [Anlässe](${abs(routes.occasions)}): Blumen für Geburtstag, Liebe, Danke, Trauer und mehr`,
    `- [Lieferung](${abs(routes.delivery)}): Liefergebiete, Gebühren, Zeitfenster, Same-Day`,
    `- [Häufige Fragen](${abs(routes.faq)})`,
    `- [Firmenkunden](${abs(routes.business)})`,
    `- [Über uns](${abs(routes.about)})`,
    `- [Kontakt](${abs(routes.contact)})`,
    "",
    "## Sträuße (Auswahl)",
    "",
    ...(products.some((p) => p.bestseller) ? products.filter((p) => p.bestseller) : [...products].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
      .slice(0, 12)
      .map((p) => `- [${p.name}](${abs(routes.product(p.slug))}): ${clean(p.tagline)}${p.pricePending ? "" : `, ab ${eur(Math.min(...p.sizes.map((s) => s.price)))}`}`),
    "",
    "## Optional",
    "",
    ...data.occasions.map((o) => `- [${o.name}](${abs(routes.occasion(o.slug))})`),
    ...data.landingPages.map((l) => `- [${l.title}](${abs(`/${l.slug}`)})`),
    "",
  ];
  return lines.join("\n");
}

function productBlock(p: Product, c: ReturnType<typeof ctx>): string[] {
  const out = [`### ${p.name}`, "", `URL: ${c.abs(routes.product(p.slug))}`, ""];
  if (p.tagline) out.push(clean(p.tagline), "");
  if (p.description) out.push(clean(p.description), "");
  if (p.pricePending) out.push("- Preis: folgt in Kürze (derzeit nicht bestellbar)");
  else {
    out.push("- Größen und Preise:");
    for (const s of p.sizes) {
      const detail = [s.stems ? `${s.stems} Stiele` : "", s.description ? clean(s.description) : ""].filter(Boolean).join(", ");
      out.push(`  - ${s.label}: ${eur(s.price)}${detail ? ` (${detail})` : ""}`);
    }
  }
  if (p.flowers.length) out.push(`- Blumen: ${p.flowers.join(", ")}`);
  if (p.colors.length) out.push(`- Farben: ${p.colors.map((v) => label(COLOR_OPTIONS, v)).join(", ")}`);
  if (p.colorOptions?.length) out.push(`- Farbe wählbar: ${p.colorOptions.map((o) => o.label).join(", ")}`);
  if (p.styles.length) out.push(`- Stil: ${p.styles.map((v) => label(STYLE_OPTIONS, v)).join(", ")}`);
  if (p.occasions.length) out.push(`- Passend für: ${p.occasions.map(c.occasionName).join(", ")}`);
  if (p.seasons.length) out.push(`- Saison: ${p.seasons.map((s) => SEASONS[s] ?? s).join(", ")}`);
  out.push(`- Lieferung am selben Tag möglich: ${p.sameDayCapable ? "ja (in Wien, bis zum Bestellschluss)" : "nein"}`);
  if (p.care.length) out.push(`- Pflege: ${p.care.map(clean).join(" ")}`);
  out.push("");
  return out;
}

/** `/llms-full.txt` – the complete shop knowledge in one Markdown file. */
export function buildLlmsFull(data: LlmsData): string {
  const c = ctx(data);
  const { abs, products, brand } = c;
  const out: string[] = [buildLlmsTxt(data), "---", "", `# ${brand.name} – vollständige Informationen`, ""];

  // Company
  const about = data.pages.find((p) => p.slug === "ueber-uns");
  if (about && !pagePlaceholder(about)) {
    out.push("## Über uns", "");
    if (about.intro) out.push(clean(about.intro), "");
    for (const s of about.sections.filter((x) => !x.placeholder)) {
      if (s.heading) out.push(`### ${s.heading}`, "");
      for (const para of s.paragraphs) if (!isPlaceholder(para)) out.push(clean(para), "");
    }
  }

  // Delivery
  out.push("## Lieferung", "", ...deliverySummary(data), "");
  for (const z of c.zones) {
    out.push(`### ${z.name} (${z.region})`, "");
    out.push(`- Postleitzahlen: ${z.postalCodes.join(", ")}`);
    out.push(`- Liefergebühr: ${z.fee === 0 ? "kostenlos" : eur(z.fee)}${z.freeFrom ? `, kostenlos ab ${eur(z.freeFrom)} Bestellwert` : ""}`);
    if (z.minOrder > 0) out.push(`- Mindestbestellwert: ${eur(z.minOrder)}`);
    out.push(`- Liefertage: ${weekdayRange(z.deliveryDays)}`);
    if (data.settings.sameDayEnabled && z.sameDay) out.push(`- Same-Day: Bestellung bis ${z.sameDayCutoff} Uhr${z.sameDayCutoffSunday ? `, sonntags bis ${z.sameDayCutoffSunday} Uhr` : ""}`);
    else out.push("- Same-Day: nein");
    const w = z.windows.filter((x) => x.active);
    if (w.length) out.push(`- Zeitfenster: ${w.map((x) => `${x.label}${x.surcharge ? ` (+${eur(x.surcharge)})` : ""}`).join(", ")}`);
    if (z.note && !isPlaceholder(z.note)) out.push(`- Hinweis: ${clean(z.note)}`);
    out.push("");
  }

  // Payment
  out.push("## Bezahlung", "", ...data.settings.payments.filter((p) => p.enabled).map((p) => `- ${p.label}`), "");

  // Products
  out.push("## Sortiment", "", `${products.length} Produkte. Alle Preise sind Endpreise in Euro. ${VAT_TEXT.note} Dazu kommt die Liefergebühr je Bezirk.`, "");
  const byCategory = new Map<string, Product[]>();
  for (const p of [...products].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))) {
    byCategory.set(p.category, [...(byCategory.get(p.category) ?? []), p]);
  }
  for (const [slug, list] of byCategory) {
    const cat = data.categories.find((x) => x.slug === slug);
    out.push(`## ${cat?.name ?? slug}`, "");
    if (cat?.intro) out.push(clean(cat.intro), "", `Übersicht: ${abs(routes.category(cat.slug))}`, "");
    for (const p of list) out.push(...productBlock(p, c));
  }

  // Extras
  if (data.extras.length) {
    out.push("## Extras und Geschenke zum Strauß", "");
    for (const e of data.extras) out.push(`- ${e.name}: ${eur(e.price)}${e.description ? ` – ${clean(e.description)}` : ""}`);
    out.push("");
  }

  // Occasions
  out.push("## Anlässe", "");
  for (const o of data.occasions) {
    const count = products.filter((p) => p.occasions.includes(o.slug)).length;
    out.push(`### ${o.name}`, "", `URL: ${abs(routes.occasion(o.slug))}${count ? ` (${count} passende Sträuße)` : ""}`, "");
    if (o.intro) out.push(clean(o.intro), "");
  }

  // Landing pages
  if (data.landingPages.length) {
    out.push("## Themen", "");
    for (const l of data.landingPages) {
      out.push(`### ${l.title}`, "", `URL: ${abs(`/${l.slug}`)}`, "");
      if (l.intro) out.push(clean(l.intro), "");
      for (const s of l.sections.filter((x) => !x.placeholder)) {
        for (const para of s.paragraphs) if (!isPlaceholder(para)) out.push(clean(para), "");
      }
    }
  }

  // FAQ
  if (data.faqs.length) {
    out.push("## Häufige Fragen", "");
    for (const f of data.faqs) out.push(`### ${clean(f.question)}`, "", clean(f.answer), "");
  }

  // Reviews (verified only)
  const reviews = publicReviews(data.reviews);
  if (reviews.length) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    out.push("## Kundenbewertungen", "", `${reviews.length} verifizierte Bewertungen nach Bestellung, Durchschnitt ${avg.toFixed(1).replace(".", ",")} von 5 Sternen.`, "");
    for (const r of reviews.slice(0, 30)) out.push(`- ${r.rating}/5, ${r.name}, ${r.date}: „${clean(r.text)}“`);
    out.push("");
  }

  // Contact
  const contact = contactLines(data);
  out.push("## Kontakt", "", ...contact, `- Kontaktformular: ${abs(routes.contact)}`, `- Impressum: ${abs(routes.legal.imprint)}`, "");
  return out.join("\n");
}

// Dumps every translatable CMS text in the shape of ContentTranslations
// (src/lib/i18n-content.ts) with the German values – the input for translators.
// Usage: node scripts/i18n-source.mjs > i18n-source.de.json
import fs from "node:fs";
const read = (n) => JSON.parse(fs.readFileSync(`content/${n}.json`, "utf8"));
const seo = (s) => ({ title: s.title, description: s.description });
const products = Object.fromEntries(read("products").filter((p) => p.active).map((p) => [p.id, {
  name: p.name, tagline: p.tagline, shortDescription: p.shortDescription, description: p.description,
  flowers: p.flowers, care: p.care, seo: seo(p.seo),
  sizes: Object.fromEntries(p.sizes.map((s) => [s.id, Object.fromEntries(Object.entries({ label: s.label, description: s.description, detailAlt: s.detailAlt }).filter(([, v]) => v))])),
  ...(p.colorOptions?.length ? { colorOptions: Object.fromEntries(p.colorOptions.map((c) => [c.id, c.label])) } : {}),
  imageAlts: Object.fromEntries(p.images.filter((i) => i.alt).map((i) => [i.src, i.alt])),
}]));
const categories = Object.fromEntries(read("categories").map((c) => [c.slug, { name: c.name, headline: c.headline, intro: c.intro, seo: seo(c.seo) }]));
const occasions = Object.fromEntries(read("occasions").map((o) => [o.slug, { name: o.name, headline: o.headline, intro: o.intro, imageAlt: o.imageAlt, seo: seo(o.seo) }]));
const extras = Object.fromEntries(read("extras").filter((e) => e.active).map((e) => [e.id, { name: e.name, description: e.description, imageAlt: e.imageAlt }]));
const faqs = Object.fromEntries(read("faqs").map((f) => [f.id, { question: f.question, answer: f.answer, ...(f.category ? { category: f.category } : {}) }]));
const pages = Object.fromEntries(read("pages").filter((p) => ["ueber-uns", "lieferung", "kontakt"].includes(p.slug)).map((p) => [p.slug, {
  title: p.title, ...(p.intro ? { intro: p.intro } : {}), seo: seo(p.seo),
  sections: p.sections.map((s) => ({ ...(s.heading ? { heading: s.heading } : {}), paragraphs: s.paragraphs, ...(s.image?.alt ? { imageAlt: s.image.alt } : {}) })),
}]));
const strip = (v, key = "") => {
  if (typeof v === "string") return /^(href|src|image|imageWide|imagePortrait|video|icon)$/.test(key) ? undefined : v;
  if (Array.isArray(v)) return /^(slugs|productSlugs|ids)$/.test(key) ? undefined : v.map((x) => strip(x)).filter((x) => x !== undefined);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) { const r = strip(x, k); if (r !== undefined && !(typeof r === "object" && !Array.isArray(r) && !Object.keys(r).length)) o[k] = r; }
    return o;
  }
  return undefined;
};
const homepage = strip(read("homepage"));
const s = read("settings");
const settings = {
  claim: s.brand.claim,
  seo: { defaultTitle: s.seo.defaultTitle, defaultDescription: s.seo.defaultDescription },
  announcement: { messages: s.announcement.messages },
  trust: s.trust.map((t) => ({ title: t.title, text: t.text })),
  orderStatuses: Object.fromEntries(s.orderStatuses.filter((o) => o.customerVisible).map((o) => [o.key, { label: o.label, description: o.description }])),
  payments: Object.fromEntries(s.payments.map((p) => [p.id, p.label])),
  ...(s.brand.openingHours?.length ? { openingHours: s.brand.openingHours } : {}),
  headerCta: s.headerCta.label,
  address: { city: s.brand.address.city, country: s.brand.address.country },
};
const zones = Object.fromEntries(read("delivery-zones").map((z) => [z.id, { name: z.name, ...(z.note ? { note: z.note } : {}), windows: Object.fromEntries(z.windows.map((w) => [w.id, w.label])) }]));
process.stdout.write(JSON.stringify({ products, categories, occasions, extras, faqs, pages, homepage, settings, zones }, null, 2) + "\n");

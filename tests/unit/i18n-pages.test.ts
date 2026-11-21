import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Category, FAQ, LandingPage, Product } from "@/types";
import { LOCALES, type Locale } from "@/i18n/config";
import { SEGMENT_NAMES } from "@/i18n/paths";
import { applyFilter } from "@/lib/catalog";

/** Topic pages written per language (content/landing-pages-<locale>.json). */
const read = <T,>(n: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", `${n}.json`), "utf8")) as T;
const products = read<Product[]>("products").filter((p) => p.active);
const categories = read<Category[]>("categories");
const faqIds = new Set(read<FAQ[]>("faqs").map((f) => f.id));
const occasions = new Set(read<{ slug: string }[]>("occasions").map((o) => o.slug));
const RESERVED = ["checkout", "bestellung", "konto", "bewertung", "auth", "newsletter", "partner-auftrag", "impressum", "datenschutz", "agb", "widerruf", "vertrag-widerrufen", "blumen-abo"];

describe.each(LOCALES.filter((l) => l !== "de"))("topic pages %s", (locale) => {
  const file = path.join(process.cwd(), "content", `landing-pages-${locale}.json`);
  it.skipIf(!fs.existsSync(file))("are valid", () => {
    const pages = JSON.parse(fs.readFileSync(file, "utf8")) as LandingPage[];
    const segs = new Set([...Object.values(SEGMENT_NAMES[locale as Exclude<Locale, "de">]), ...Object.keys(SEGMENT_NAMES.en), ...RESERVED]);
    const slugs = new Set<string>();
    for (const p of pages) {
      const id = `${locale}/${p.slug}`;
      expect(p.slug, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(segs.has(p.slug), `${id}: slug collides with a route`).toBe(false);
      expect(slugs.has(p.slug), `${id}: duplicate`).toBe(false);
      slugs.add(p.slug);
      expect(p.locale, `${id}: locale is set automatically`).toBeUndefined();
      for (const k of ["title", "headline", "intro"] as const) expect(p[k]?.trim().length, `${id}.${k}`).toBeGreaterThan(0);
      expect(p.seo.title.length, `${id}: seo.title`).toBeLessThanOrEqual(70);
      expect(p.seo.description.length, `${id}: seo.description`).toBeLessThanOrEqual(170);
      expect(p.sections.length, `${id}: sections`).toBeGreaterThan(0);
      for (const f of p.faqIds) expect(faqIds.has(f), `${id}: faq ${f}`).toBe(true);
      for (const o of p.productFilter.occasions ?? []) expect(occasions.has(o), `${id}: occasion ${o}`).toBe(true);
      if (p.productFilter.category) expect(categories.some((c) => c.slug === p.productFilter.category), `${id}: category`).toBe(true);
      if (p.image) expect(fs.existsSync(path.join(process.cwd(), "public", p.image)), `${id}: image ${p.image}`).toBe(true);
      const f = p.productFilter;
      const hits = applyFilter(products, { occasions: f.occasions, category: f.category, colors: f.colors, seasons: f.seasons, sameDayOnly: f.sameDayOnly }, categories);
      expect(hits.length, `${id}: filter finds no products`).toBeGreaterThan(0);
      // Fee amounts change in the admin – pages must not state them.
      expect(JSON.stringify(p), `${id}: no fee amounts`).not.toMatch(/[34][,.]?(99|30)\s?€|€\s?[34][,.](99|30)/);
    }
  });
});

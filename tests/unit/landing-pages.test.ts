import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import fs from "node:fs";
import path from "node:path";
import type { Category, FAQ, LandingPage, Occasion, Product } from "@/types";
import { LANDING_PAGES_WAVE1 } from "@/lib/landing-pages-wave1";
import { LANDING_GROUPS, relatedLandingPages } from "@/lib/landing-links";
import { appendMissingBySlug } from "@/lib/content-migrations";
import { applyFilter, sortProducts } from "@/lib/catalog";

const read = <T,>(name: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", `${name}.json`), "utf8")) as T;
const pages = read<LandingPage[]>("landing-pages");
const products = read<Product[]>("products");
const categories = read<Category[]>("categories");
const occasions = read<Occasion[]>("occasions");
const faqs = read<FAQ[]>("faqs");

/** Pages the filter can only fill with fewer products (the Advent category has one product in seven colours). */
const FEW_PRODUCTS_OK = new Set(["adventskranz-liefern-wien"]);

describe("landing pages wave 1", () => {
  it("ships every page in the repository content, unchanged", () => {
    for (const p of LANDING_PAGES_WAVE1) expect(pages.find((x) => x.slug === p.slug), p.slug).toEqual(p);
  });

  it("uses unique, clean slugs that collide with no route", () => {
    const routes = fs.readdirSync(path.join(process.cwd(), "src", "app", "(shop)"));
    const slugs = pages.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(routes).not.toContain(slug);
    }
  });

  it("keeps SEO texts short and references only existing FAQs and images", () => {
    const faqIds = new Set(faqs.map((f) => f.id));
    for (const p of LANDING_PAGES_WAVE1) {
      expect(p.seo.title.length, p.slug).toBeLessThanOrEqual(60);
      expect(p.seo.description.length, p.slug).toBeLessThanOrEqual(155);
      expect(p.faqIds.length, p.slug).toBeGreaterThanOrEqual(2);
      for (const id of p.faqIds) expect(faqIds.has(id), `${p.slug}: ${id}`).toBe(true);
      if (p.image) expect(fs.existsSync(path.join(process.cwd(), "public", p.image)), p.image).toBe(true);
      expect(p.sections.length, p.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("links only to pages that exist", () => {
    const slugs = new Set(pages.map((p) => p.slug));
    const ok = (href: string) => {
      const [, first, second] = href.split("/");
      if (first === "produkt") return products.some((p) => p.slug === second && p.active);
      if (first === "anlaesse") return occasions.some((o) => o.slug === second);
      if (first === "blumen") return categories.some((c) => c.slug === second);
      if (second === undefined && slugs.has(first)) return true;
      return ["/firmenkunden", "/erinnerung"].includes(href);
    };
    for (const p of LANDING_PAGES_WAVE1) {
      for (const s of p.sections) for (const text of s.paragraphs) {
        for (const m of text.matchAll(/\]\((\/[^)]*)\)/g)) expect(ok(m[1]), `${p.slug}: ${m[1]}`).toBe(true);
      }
    }
  });

  it("shows at least four fitting products on every page", () => {
    for (const p of LANDING_PAGES_WAVE1) {
      const f = p.productFilter;
      // Same selection as src/app/(shop)/[slug]/page.tsx.
      const list = sortProducts(
        applyFilter(products, { occasions: f.occasions, category: f.category, colors: f.colors, seasons: f.seasons, sameDayOnly: f.sameDayOnly }, categories),
        f.sameDayOnly ? "bestseller" : "recommended",
      ).slice(0, f.limit ?? 8);
      expect(list.length, p.slug).toBeGreaterThanOrEqual(FEW_PRODUCTS_OK.has(p.slug) ? 1 : 4);
      expect(list.some((x) => x.category === "trauer"), p.slug).toBe(false);
    }
  });

  it("promises nothing the shop does not offer", () => {
    for (const p of LANDING_PAGES_WAVE1) {
      const text = JSON.stringify(p);
      expect(text, p.slug).not.toMatch(/garantiert|schnellste|kein(e)? Sonntag|Montag bis Samstag(?! bis \d)|9–12|Grußkarte (ist|inklusive)|mit Grußkarte/i);
    }
  });
});

describe("related landing pages", () => {
  it("links up to eight other pages, own group first, and reaches every page", () => {
    const inbound = new Map(pages.map((p) => [p.slug, 0]));
    for (const p of pages) {
      const related = relatedLandingPages(pages, p.slug);
      expect(related.length).toBe(8);
      expect(related.map((r) => r.slug)).not.toContain(p.slug);
      expect(new Set(related).size).toBe(related.length);
      const group = LANDING_GROUPS.find((g) => g.slugs.includes(p.slug));
      if (group && group.slugs.length > 1) expect(group.slugs).toContain(related[0].slug);
      for (const r of related) inbound.set(r.slug, (inbound.get(r.slug) ?? 0) + 1);
    }
    for (const [slug, n] of inbound) expect(n, slug).toBeGreaterThan(0);
  });

  it("puts every repository page into a group", () => {
    const grouped = new Set(LANDING_GROUPS.flatMap((g) => g.slugs));
    for (const p of pages) expect(grouped.has(p.slug), p.slug).toBe(true);
  });
});

describe("appendMissingBySlug", () => {
  it("adds missing pages and never overwrites a stored one", () => {
    const stored = [{ slug: "galentinstag", title: "Vom Admin geändert" }];
    const next = appendMissingBySlug(stored, LANDING_PAGES_WAVE1);
    expect(next[0]).toBe(stored[0]);
    expect(next.length).toBe(LANDING_PAGES_WAVE1.length);
    expect(appendMissingBySlug(next, LANDING_PAGES_WAVE1)).toBe(next);
  });
});

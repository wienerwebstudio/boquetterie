import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LIVE_LOCALES, LOCALES } from "@/i18n/config";
import de from "@/i18n/messages/de";

/**
 * Translation quality gates:
 * - every placeholder `{x}` of the German text must appear in the translation (and no new ones);
 * - live languages must translate every key;
 * - content translations may only contain keys that exist in the German content and keep list lengths.
 */
type Tree = { [k: string]: string | Tree };

function leaves(t: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(t)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(key, v);
    else if (v && typeof v === "object" && !Array.isArray(v)) for (const [kk, vv] of leaves(v as Tree, key)) out.set(kk, vv);
  }
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const german = leaves(de as unknown as Tree);
const others = LOCALES.filter((l) => l !== "de");

describe.each(others)("UI texts %s", (locale) => {
  it("keeps placeholders and only uses known keys", async () => {
    const mod = (await import(`@/i18n/messages/${locale}`)) as { default: Tree };
    const t = leaves(mod.default);
    for (const [key, value] of t) {
      // Extra plural forms (few/many/two/zero) belong to a German `{ one, other }` object.
      const plural = key.match(/^(.*)\.(few|many|two|zero)$/);
      const source = plural && german.has(`${plural[1]}.other`) ? `${plural[1]}.other` : key;
      expect(german.has(source), `${locale}: unknown key ${key}`).toBe(true);
      expect(placeholders(value), `${locale}: placeholders in ${key}`).toEqual(placeholders(german.get(source) ?? ""));
      expect(value.trim().length, `${locale}: empty ${key}`).toBeGreaterThan(0);
    }
    if (LIVE_LOCALES.includes(locale)) {
      const missing = [...german.keys()].filter((k) => !t.has(k));
      expect(missing, `${locale}: missing keys`).toEqual([]);
    }
  });
});

describe.each(others)("content translations %s", (locale) => {
  const file = path.join(process.cwd(), "content", `i18n-${locale}.json`);
  it.skipIf(!fs.existsSync(file))("matches the German content structure", () => {
    const t = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    const read = (n: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", `${n}.json`), "utf8"));
    const products = new Map((read("products") as { id: string; flowers: string[]; care: string[]; sizes: { id: string }[] }[]).map((p) => [p.id, p]));
    for (const [id, p] of Object.entries((t.products ?? {}) as Record<string, { flowers?: string[]; care?: string[]; sizes?: Record<string, unknown> }>)) {
      const g = products.get(id);
      expect(g, `${locale}: unknown product ${id}`).toBeTruthy();
      if (!g) continue;
      if (p.flowers) expect(p.flowers.length, `${locale}: ${id}.flowers`).toBe(g.flowers.length);
      if (p.care) expect(p.care.length, `${locale}: ${id}.care`).toBe(g.care.length);
      for (const sid of Object.keys(p.sizes ?? {})) expect(g.sizes.some((s) => s.id === sid), `${locale}: ${id} size ${sid}`).toBe(true);
    }
    const slugs = (n: string) => new Set((read(n) as { slug: string }[]).map((x) => x.slug));
    for (const k of Object.keys((t.categories ?? {}) as object)) expect(slugs("categories").has(k), `${locale}: category ${k}`).toBe(true);
    for (const k of Object.keys((t.occasions ?? {}) as object)) expect(slugs("occasions").has(k), `${locale}: occasion ${k}`).toBe(true);
    const faqIds = new Set((read("faqs") as { id: string }[]).map((f) => f.id));
    for (const k of Object.keys((t.faqs ?? {}) as object)) expect(faqIds.has(k), `${locale}: faq ${k}`).toBe(true);
    // No prices or links may be smuggled in.
    expect(JSON.stringify(t)).not.toMatch(/"(price|href|src|slug|image)"\s*:/);
  });
});

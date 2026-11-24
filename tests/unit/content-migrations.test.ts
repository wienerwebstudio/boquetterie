import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import fs from "node:fs";
import path from "node:path";
import { CONTENT_MIGRATIONS, migrateDocument, removeValuesAt, replacePlaceholderPages, replaceTextDeep, runContentMigrations } from "@/lib/content-migrations";
import type { DocumentStore, StoreKind } from "@/lib/store";

function memoryStore(content: Record<string, unknown>): DocumentStore & { docs: Map<string, unknown>; writes: string[] } {
  const docs = new Map<string, unknown>(Object.entries(content).map(([k, v]) => [`content/${k}`, structuredClone(v)]));
  const writes: string[] = [];
  return {
    name: "postgres", docs, writes,
    async get<T>(kind: StoreKind, name: string) { return (docs.has(`${kind}/${name}`) ? structuredClone(docs.get(`${kind}/${name}`)) : null) as T | null; },
    async set(kind: StoreKind, name: string, value: unknown) { writes.push(`${kind}/${name}`); docs.set(`${kind}/${name}`, structuredClone(value)); },
    async canWriteData() { return true; },
  };
}

describe("content migration helpers", () => {
  it("replaces exact passages deep and keeps untouched objects identical", () => {
    const doc = { a: "Wähle Größe, Grußkarte und kleine Extras.", b: { c: ["frisch gebunden, mit Grußkarte."] }, d: 1, e: { f: "bleibt" } };
    const next = replaceTextDeep(doc, [["Grußkarte und ", ""], ["mit Grußkarte.", "mit Wunschdatum."]]);
    expect(next).toEqual({ a: "Wähle Größe, kleine Extras.", b: { c: ["frisch gebunden, mit Wunschdatum."] }, d: 1, e: { f: "bleibt" } });
    expect(next.e).toBe(doc.e);
    expect(replaceTextDeep(doc, [["gibt es nicht", "x"]])).toBe(doc);
  });

  it("drops exact values from a nested list", () => {
    const doc = { announcement: { enabled: true, messages: ["Wien", "Grußkarte inklusive"] } };
    expect(removeValuesAt(doc, "announcement.messages", ["Grußkarte inklusive"])).toEqual({ announcement: { enabled: true, messages: ["Wien"] } });
    expect(removeValuesAt(doc, "announcement.nope", ["x"])).toBe(doc);
  });
});

describe("runContentMigrations", () => {
  const settings = {
    announcement: { enabled: true, messages: ["Blumenlieferung in ganz Wien", "Grußkarte inklusive"] },
    trust: [{ icon: "mail", title: "Persönliche Grußkarte", text: "Deine Worte, unsere Karte" }],
    seo: { defaultDescription: "Wunschdatum wählen, Grußkarte schreiben, Freude schicken – Blumenversand für Wien." },
    brand: { name: "Vom Admin geändert" },
  };

  it("patches stored documents once, keeps admin edits and records the id", async () => {
    const store = memoryStore({ settings, homepage: { howItWorks: { steps: [{ text: "Wähle Größe, Grußkarte und kleine Extras." }] } } });
    await runContentMigrations(store);
    const s = store.docs.get("content/settings") as typeof settings;
    expect(s.announcement.messages).toEqual(["Blumenlieferung in ganz Wien"]);
    // Greeting-card copy first became "Kommen bald", then (2026-11-24) the Express card.
    expect(s.trust[0]).toEqual({ icon: "clock", title: "Express in 1–2 Stunden", text: "Ohne Aufpreis, Same Day bis 18:30 Uhr" });
    expect(s.seo.defaultDescription).toBe("Wunschdatum wählen, Freude schicken – Blumenversand für Wien.");
    expect(s.brand.name).toBe("Vom Admin geändert");
    expect(store.docs.get("data/content-migrations")).toEqual(CONTENT_MIGRATIONS.map((m) => m.id));
    expect(store.writes).not.toContain("content/faqs"); // not in the store yet → seeded later from the repo

    const before = store.writes.length;
    await runContentMigrations(store);
    expect(store.writes.length).toBe(before);
  });

  it("does nothing for the JSON store", async () => {
    const store = { ...memoryStore({ settings }), name: "json" as const };
    await runContentMigrations(store);
    expect(store.writes).toEqual([]);
  });

  it("the repository content already equals the result of all migrations, applied in order", () => {
    const dir = path.join(process.cwd(), "content");
    const names = new Set(CONTENT_MIGRATIONS.flatMap((m) => [...Object.keys(m.replace ?? {}), ...Object.keys(m.removeValues ?? {}), ...Object.keys(m.transform ?? {})]));
    for (const name of names) {
      const doc = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"));
      const migrated = CONTENT_MIGRATIONS.reduce((d, m) => migrateDocument(m, name, d), doc);
      expect(migrated, `content/${name}.json is not migrated`).toEqual(doc);
    }
  });
});

describe("legal pages from the repository", () => {
  const repo = [{ slug: "agb", title: "AGB neu" }, { slug: "widerruf", title: "Widerruf neu" }, { slug: "datenschutz", title: "DS neu" }];

  it("replaces placeholders and adds missing pages, but never real text", () => {
    const stored = [{ slug: "agb", title: "Platzhalter", placeholder: true }, { slug: "datenschutz", title: "Vom Admin geschrieben" }];
    const next = replacePlaceholderPages(stored, repo, ["agb", "datenschutz", "widerruf"]);
    expect(next).toEqual([{ slug: "agb", title: "AGB neu" }, { slug: "datenschutz", title: "Vom Admin geschrieben" }, { slug: "widerruf", title: "Widerruf neu" }]);
    expect(replacePlaceholderPages(next, repo, ["agb"])).toBe(next);
  });

  it("runs as part of the migrations against the stored pages", async () => {
    const store = memoryStore({ pages: [{ slug: "agb", title: "Platzhalter", placeholder: true }] });
    await runContentMigrations(store, CONTENT_MIGRATIONS, memoryStore({ pages: repo }));
    expect(store.docs.get("content/pages")).toEqual([{ slug: "agb", title: "AGB neu" }, { slug: "datenschutz", title: "DS neu" }, { slug: "widerruf", title: "Widerruf neu" }]);
  });

  it("ships real legal texts, not placeholders, in the repository", () => {
    const pages = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "pages.json"), "utf8")) as { slug: string; placeholder?: boolean; sections: { paragraphs: string[] }[] }[];
    for (const slug of ["agb", "datenschutz", "widerruf"]) {
      const page = pages.find((p) => p.slug === slug)!;
      expect(page.placeholder).toBeUndefined();
      expect(JSON.stringify(page)).not.toMatch(/Platzhalter|\[Hier |\[Tatsächlich|ergänzen\.\]/);
    }
  });
});

describe("same-day until 18:30", () => {
  it("switches same-day on for the Vienna zones and every product, keeps other zones", async () => {
    const store = memoryStore({
      settings: { sameDayEnabled: false, brand: { name: "Blumora" } },
      "delivery-zones": [
        { id: "wien-nah", sameDay: true, sameDayCutoff: "12:00", cutoff: "14:00" },
        { id: "noe-umland", sameDay: false, sameDayCutoff: "10:00", cutoff: "12:00" },
      ],
      products: [{ id: "p-1", sameDayCapable: false }, { id: "p-2" }],
    });
    await runContentMigrations(store, CONTENT_MIGRATIONS, memoryStore({}));
    expect(store.docs.get("content/settings")).toEqual({ sameDayEnabled: true, brand: { name: "Blumora" } });
    expect(store.docs.get("content/delivery-zones")).toEqual([
      { id: "wien-nah", sameDay: true, sameDayCutoff: "18:30", cutoff: "23:59" },
      { id: "noe-umland", sameDay: false, sameDayCutoff: "10:00", cutoff: "12:00" },
    ]);
    expect(store.docs.get("content/products")).toEqual([{ id: "p-1", sameDayCapable: true }, { id: "p-2", sameDayCapable: true }]);
  });
});

describe("review date fix", () => {
  it("moves only Emre Ünsal's review from 17 to 16 Nov", async () => {
    const { CONTENT_MIGRATIONS, migrateDocument } = await import("@/lib/content-migrations");
    const m = CONTENT_MIGRATIONS.find((x) => x.id === "2026-11-18-review-date-emre")!;
    const out = migrateDocument(m, "reviews", [
      { id: "a", name: "Emre Ünsal", date: "2026-11-17" },
      { id: "b", name: "Andere", date: "2026-11-17" },
      { id: "c", name: "Emre Ünsal", date: "2026-11-20" },
    ]) as { date: string }[];
    expect(out.map((r) => r.date)).toEqual(["2026-11-16", "2026-11-17", "2026-11-20"]);
  });
});

describe("ganz Wien / Same Day / Express + new phone (2026-11-24)", () => {
  it("changes the seeded German texts, adds the FAQ once and keeps admin edits", async () => {
    const { VIENNA_EXPRESS_TEXTS: T, OLD_PHONE, NEW_PHONE } = await import("@/lib/content-updates-vienna-express");
    const de = T.de;
    const store = memoryStore({
      settings: {
        brand: { phone: OLD_PHONE },
        seo: { defaultTitle: "x", defaultDescription: de.seo.from },
        announcement: { enabled: true, messages: de.announcement.from },
        trust: [{ icon: "leaf", title: "Frisch", text: "t" }, { icon: "truck", title: "Kurier", text: de.trustDistricts.from }, { icon: "mail", ...de.trustCard.from }],
      },
      homepage: { hero: { eyebrow: de.eyebrow.from, headline: "h" } },
      faqs: [{ id: "f-where", sortOrder: 1 }, { id: "f-today", sortOrder: 2 }, { id: "f-date", sortOrder: 3 }],
      pages: [{ slug: "impressum", sections: [{ paragraphs: [`Telefon: ${OLD_PHONE}`] }] }],
      "i18n-en": { settings: { seo: { defaultDescription: "edited in admin" }, announcement: { messages: T.en.announcement.from }, trust: [{ title: "a", text: T.en.trustDistricts.from }, T.en.trustCard.from] }, homepage: { hero: { eyebrow: T.en.eyebrow.from } }, faqs: { "f-today": { question: "q" } } },
    });
    await runContentMigrations(store, CONTENT_MIGRATIONS, memoryStore({}));
    const s = store.docs.get("content/settings") as { brand: { phone: string }; seo: { defaultDescription: string }; announcement: { messages: string[] }; trust: { icon: string; title: string; text: string }[] };
    expect(s.brand.phone).toBe(NEW_PHONE);
    expect(s.seo.defaultDescription).toBe(de.seo.to);
    expect(s.announcement.messages).toEqual(de.announcement.to);
    expect(s.trust[1].text).toBe("In ganz Wien – alle 23 Bezirke");
    expect(s.trust[2]).toEqual({ icon: "clock", title: "Express in 1–2 Stunden", text: "Ohne Aufpreis, Same Day bis 18:30 Uhr" });
    expect((store.docs.get("content/homepage") as { hero: { eyebrow: string } }).hero.eyebrow).toBe("Blumenversand in ganz Wien");
    const faqs = store.docs.get("content/faqs") as { id: string; sortOrder: number; question?: string }[];
    expect(faqs.map((f) => f.id)).toEqual(["f-where", "f-today", "f-express", "f-date"]);
    expect(faqs[2]).toMatchObject({ sortOrder: 2.5, question: "Gibt es eine Express-Lieferung?", category: "lieferung" });
    expect(JSON.stringify(store.docs.get("content/pages"))).toContain(`Telefon: ${NEW_PHONE}`);
    const en = store.docs.get("content/i18n-en") as { settings: { seo: { defaultDescription: string }; announcement: { messages: string[] }; trust: { title: string; text: string }[] }; homepage: { hero: { eyebrow: string } }; faqs: Record<string, { question: string }> };
    expect(en.settings.seo.defaultDescription).toBe("edited in admin");
    expect(en.settings.announcement.messages).toEqual(T.en.announcement.to);
    expect(en.settings.trust[1]).toEqual(T.en.trustCard.to);
    expect(en.homepage.hero.eyebrow).toBe("Flower delivery across Vienna");
    expect(en.faqs["f-express"].question).toBe("Do you offer express delivery?");
    // A second run changes nothing.
    const { withExpressFaq } = await import("@/lib/content-migrations");
    expect(withExpressFaq(faqs)).toBe(faqs);
  });

  it("has every language with four announcement messages", async () => {
    const { VIENNA_EXPRESS_TEXTS: T } = await import("@/lib/content-updates-vienna-express");
    expect(Object.keys(T).sort()).toEqual(["ar", "bg", "bks", "ce", "de", "en", "es", "fa", "fr", "hu", "it", "pl", "ro", "ru", "sk", "tr", "uk"]);
    for (const [l, t] of Object.entries(T)) {
      expect(t.announcement.to, l).toHaveLength(4);
      expect(t.announcement.from, l).toHaveLength(3);
    }
  });
});

describe("Love Deluxe XXL (2026-11-24)", () => {
  it("adds XXL once, only to Love Deluxe, keeping prices edited in the admin", async () => {
    const { withLoveDeluxeXxl } = await import("@/lib/content-migrations");
    const four = { id: "p-love-deluxe", sizes: [{ id: "s", price: 50 }, { id: "m" }, { id: "l" }, { id: "xl" }] };
    const next = withLoveDeluxeXxl(four) as typeof four;
    expect(next.sizes.map((s) => s.id)).toEqual(["s", "m", "l", "xl", "xxl"]);
    expect(next.sizes[0]).toEqual({ id: "s", price: 50 });
    expect(next.sizes[4]).toEqual({ id: "xxl", label: "XXL", price: 175.9 });
    expect(withLoveDeluxeXxl(next)).toBe(next);
    const other = { id: "p-red-passion", sizes: [{ id: "s" }] };
    expect(withLoveDeluxeXxl(other)).toBe(other);
  });
});

describe("delivery fees 4,90 / 7,90 (2026-11-24)", () => {
  it("rewrites old fee amounts in every number format, but no other numbers", async () => {
    const { withNewFeeAmounts } = await import("@/lib/content-migrations");
    expect(withNewFeeAmounts("gratis, 3,99 € oder 7,99 €")).toBe("gratis, 4,90 € oder 7,90 €");
    expect(withNewFeeAmounts("free, €3.99 or €7.99")).toBe("free, €4.90 or €7.90");
    expect(withNewFeeAmounts("43,99 € · 3,990 · 17.99")).toBe("43,99 € · 3,990 · 17.99");
    const doc = { a: ["x 3,99 €"], b: "unchanged" };
    const next = withNewFeeAmounts(doc);
    expect(next).toEqual({ a: ["x 4,90 €"], b: "unchanged" });
    expect(withNewFeeAmounts(next)).toBe(next);
  });
});

describe("new address Bachgasse (2026-11-24)", () => {
  it("moves the address in the legal pages and the settings, once", async () => {
    const { withNewAddress } = await import("@/lib/content-migrations");
    const m = CONTENT_MIGRATIONS.find((x) => x.id === "2026-11-24-address-bachgasse")!;
    const pages = [{ slug: "impressum", sections: [{ paragraphs: ["Tunahan Ceylan", "Am Langen Felde 51/18, 1220 Wien"] }] }, { slug: "agb", sections: [{ paragraphs: ["Blumora\nAm Langen Felde 51/18\n1220 Wien, Österreich"] }] }];
    expect(JSON.stringify(migrateDocument(m, "pages", pages))).toBe(JSON.stringify([{ slug: "impressum", sections: [{ paragraphs: ["Tunahan Ceylan", "Bachgasse 22/11, 1160 Wien"] }] }, { slug: "agb", sections: [{ paragraphs: ["Blumora\nBachgasse 22/11\n1160 Wien, Österreich"] }] }]));
    const s = { brand: { name: "Blumora", address: { street: "Am Langen Felde 51/18", zip: "1220", city: "Wien", country: "Österreich" } } };
    const next = withNewAddress(s);
    expect(next.brand.address).toEqual({ street: "Bachgasse 22/11", zip: "1160", city: "Wien", country: "Österreich" });
    expect(withNewAddress(next)).toBe(next);
  });
});

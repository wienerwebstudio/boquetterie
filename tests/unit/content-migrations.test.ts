import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CONTENT_MIGRATIONS, migrateDocument, removeValuesAt, replaceTextDeep, runContentMigrations } from "@/lib/content-migrations";
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
    expect(s.trust[0]).toEqual({ icon: "mail", title: "Grußkarten", text: "Kommen bald" });
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

  it("leaves no promised greeting card in the repository content", () => {
    const dir = path.join(process.cwd(), "content");
    for (const m of CONTENT_MIGRATIONS) {
      for (const name of new Set([...Object.keys(m.replace ?? {}), ...Object.keys(m.removeValues ?? {})])) {
        const doc = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"));
        expect(migrateDocument(m, name, doc), `content/${name}.json is not migrated`).toBe(doc);
      }
    }
  });
});

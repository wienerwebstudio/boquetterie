import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** In-memory stand-in for the `documents` table, shared by both fake drivers. */
const table = new Map<string, unknown>();
const calls: { driver: string; text: string; params: unknown[] }[] = [];

function run(driver: string, text: string, params: unknown[] = []) {
  calls.push({ driver, text, params });
  if (/^\s*create table/i.test(text)) return [];
  if (/^\s*select data from documents/i.test(text)) {
    const v = table.get(`${params[0]}/${params[1]}`);
    return v === undefined ? [] : [{ data: v }];
  }
  if (/^\s*insert into documents/i.test(text)) {
    table.set(`${params[0]}/${params[1]}`, JSON.parse(params[2] as string));
    return [];
  }
  throw new Error(`unexpected SQL: ${text}`);
}

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => ({ query: async (text: string, params?: unknown[]) => run("neon-http", text, params) })),
}));
vi.mock("postgres", () => ({
  default: vi.fn(() => ({ unsafe: async (text: string, params?: unknown[]) => run("postgres-js", text, params) })),
}));

const NEON_URL = "postgresql://u:p@ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const OTHER_URL = "postgres://u:p@db.internal:5432/blumora";

beforeEach(() => {
  table.clear();
  calls.length = 0;
  delete (globalThis as { __blumoraDb?: unknown }).__blumoraDb;
});
afterEach(() => vi.unstubAllEnvs());

describe("PostgresStore driver selection", () => {
  it("uses Neon's HTTP driver for neon.tech hosts and postgres.js otherwise", async () => {
    const { getDb, isNeonUrl } = await import("@/lib/store/postgres");
    expect(isNeonUrl(NEON_URL)).toBe(true);
    expect(isNeonUrl(OTHER_URL)).toBe(false);
    expect(getDb(NEON_URL).driver).toBe("neon-http");
    expect(getDb(OTHER_URL).driver).toBe("postgres-js");
  });

  it("DATABASE_DRIVER overrides the detection", async () => {
    vi.stubEnv("DATABASE_DRIVER", "postgres");
    const { getDb } = await import("@/lib/store/postgres");
    expect(getDb(NEON_URL).driver).toBe("postgres-js");
  });
});

describe.each([
  ["neon-http", NEON_URL],
  ["postgres-js", OTHER_URL],
])("PostgresStore over %s", (driver, url) => {
  it("creates the table once, round-trips JSON and upserts", async () => {
    const { PostgresStore } = await import("@/lib/store/postgres");
    const store = new PostgresStore(url);

    expect(await store.get("data", "orders")).toBeNull();
    await store.set("data", "orders", [{ id: "BQ-1", total: 65.9 }]);
    await store.set("data", "orders", [{ id: "BQ-1", total: 65.9 }, { id: "BQ-2", total: 36.9 }]);
    expect(await store.get("data", "orders")).toEqual([{ id: "BQ-1", total: 65.9 }, { id: "BQ-2", total: 36.9 }]);

    expect(calls.every((c) => c.driver === driver)).toBe(true);
    expect(calls.filter((c) => /create table/i.test(c.text))).toHaveLength(1);
    const insert = calls.find((c) => /insert into documents/i.test(c.text))!;
    expect(insert.text).toMatch(/\$3::text::jsonb/);
    expect(insert.text).toMatch(/on conflict \(kind, name\) do update/);
  });

  it("serves content from a short cache but always reads runtime data fresh", async () => {
    const { PostgresStore } = await import("@/lib/store/postgres");
    const store = new PostgresStore(url);
    await store.set("content", "settings", { a: 1 });
    await store.get("content", "settings");
    await store.get("content", "settings");
    await store.get("data", "orders");
    await store.get("data", "orders");
    const selects = calls.filter((c) => /^\s*select/i.test(c.text));
    expect(selects.map((c) => c.params[0])).toEqual(["data", "data"]);
  });
});

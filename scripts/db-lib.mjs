// Shared helpers for scripts/db-migrate.mjs and scripts/db-seed.mjs (plain Node ESM).
import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

/** Must match `DOCUMENTS_DDL` in src/lib/store/postgres.ts. */
export const DOCUMENTS_DDL = `
  create table if not exists documents (
    kind text not null,
    name text not null,
    data jsonb not null,
    updated_at timestamptz not null default now(),
    primary key (kind, name)
  )
`;

/** Loads .env.local / .env (in that order) when DATABASE_URL is not already set. */
export function loadEnv() {
  if (process.env.DATABASE_URL) return;
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(path.join(ROOT, file));
    } catch {
      /* file missing – ignore */
    }
    if (process.env.DATABASE_URL) return;
  }
}

export function connect() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set (env, .env.local or .env). Example: postgres://user:pass@host:5432/db");
    process.exit(1);
  }
  const ssl = process.env.DATABASE_SSL;
  return postgres(url, {
    max: 1,
    connect_timeout: 15,
    prepare: process.env.DATABASE_PREPARE !== "false" && !/pgbouncer=true/i.test(url),
    ...(ssl === "require" ? { ssl: "require" } : ssl === "disable" ? { ssl: false } : {}),
    onnotice: () => undefined,
  });
}

export async function ensureSchema(sql) {
  await sql.unsafe(DOCUMENTS_DDL);
}

/** Lists `<dir>/*.json` as { name, value } – returns [] when the directory is missing. */
export async function readJsonDir(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const docs = [];
  for (const entry of entries.filter((f) => f.endsWith(".json")).sort()) {
    const raw = await fs.readFile(path.join(dir, entry), "utf8");
    docs.push({ name: entry.slice(0, -".json".length), value: JSON.parse(raw) });
  }
  return docs;
}

/** Redacts the password of a connection string for log output. */
export function describeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username || "?"}@${u.host}${u.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

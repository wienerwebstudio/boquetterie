import { neon } from "@neondatabase/serverless";
import postgres, { type Sql } from "postgres";
import type { DocumentStore, StoreKind } from "./types";

/**
 * Postgres store: every document is one row in the `documents` table.
 *
 *   documents (kind text, name text, data jsonb, updated_at timestamptz, primary key (kind, name))
 *
 * The same DDL lives in `scripts/db-lib.mjs` (used by `npm run db:migrate|db:seed`);
 * the store also runs it lazily so a fresh database works without a manual step.
 *
 * Content documents are cached in memory for a few seconds (they are read many
 * times per render); the cache is primed on `set`, so an admin save is visible to
 * the same process immediately. Runtime data (`kind = "data"`, e.g. orders) is
 * never cached – those documents are read-modify-write and must be fresh.
 */
export const DOCUMENTS_DDL = `
  create table if not exists documents (
    kind text not null,
    name text not null,
    data jsonb not null,
    updated_at timestamptz not null default now(),
    primary key (kind, name)
  )
`;

const CONTENT_TTL_MS = 5_000;

type CacheEntry = { value: unknown; expires: number };
type Row = { data: unknown };

/** The three statements the store needs, behind one small interface. */
export interface Db {
  readonly driver: "neon-http" | "postgres-js";
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Neon on serverless hosting (Netlify Functions): the HTTP driver from
 * `@neondatabase/serverless` – no TCP/TLS handshake and no pool to keep warm
 * per invocation, which is what Neon recommends for this runtime. Every
 * statement here is a single query, so HTTP (no transactions) is enough.
 * `DATABASE_DRIVER=postgres` forces postgres.js, e.g. behind PgBouncer.
 */
export function isNeonUrl(url: string) {
  try {
    return /\.neon\.tech$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function pickDriver(url: string): Db["driver"] {
  const forced = process.env.DATABASE_DRIVER;
  if (forced === "neon") return "neon-http";
  if (forced === "postgres") return "postgres-js";
  return isNeonUrl(url) ? "neon-http" : "postgres-js";
}

function createNeonDb(url: string): Db {
  const sql = neon(url);
  return { driver: "neon-http", query: async <T,>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[] };
}

/** Any other Postgres (Docker/VPS, Supabase …): postgres.js with a small pool. */
function createPostgresJsDb(url: string): Db {
  const max = Number(process.env.DATABASE_POOL_MAX ?? "5");
  const sslEnv = process.env.DATABASE_SSL;
  // Transaction poolers (pgbouncer, Supabase pooler) cannot use named prepared statements.
  const prepare = process.env.DATABASE_PREPARE !== "false" && !/pgbouncer=true/i.test(url);
  const sql: Sql = postgres(url, {
    max: Number.isFinite(max) && max > 0 ? max : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare,
    ...(sslEnv === "require" ? { ssl: "require" as const } : sslEnv === "disable" ? { ssl: false } : {}),
    onnotice: () => undefined,
  });
  return { driver: "postgres-js", query: async <T,>(text: string, params: unknown[] = []) => (await sql.unsafe(text, params as never[])) as unknown as T[] };
}

/** Keep one client per process, also across Next.js dev hot reloads. */
const g = globalThis as unknown as { __blumoraDb?: { url: string; db: Db } };

export function getDb(url = process.env.DATABASE_URL): Db {
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!g.__blumoraDb || g.__blumoraDb.url !== url) {
    g.__blumoraDb = { url, db: pickDriver(url) === "neon-http" ? createNeonDb(url) : createPostgresJsDb(url) };
  }
  return g.__blumoraDb.db;
}

/** 23505 unique_violation on pg_type / 42P07 duplicate_table – raised by racing `create table if not exists`. */
export function isConcurrentCreate(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  return code === "23505" || code === "42P07";
}

export class PostgresStore implements DocumentStore {
  readonly name = "postgres" as const;
  private cache = new Map<string, CacheEntry>();
  private pending = new Map<string, Promise<unknown>>();
  private schemaReady: Promise<void> | null = null;

  canWriteData(): Promise<boolean> {
    return Promise.resolve(true);
  }

  constructor(private readonly url = process.env.DATABASE_URL) {
    if (!this.url) throw new Error("PostgresStore requires DATABASE_URL");
  }

  private db() {
    return getDb(this.url);
  }

  /** `create table if not exists` – idempotent, runs once per process. */
  private ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = this.db()
        .query(DOCUMENTS_DDL)
        .then(() => undefined)
        .catch((err) => {
          // Several processes (build workers, cold-started functions) may create the table at the
          // same moment; Postgres then reports a duplicate even with `if not exists`. The table exists.
          if (isConcurrentCreate(err)) return;
          this.schemaReady = null; // retry on the next call
          throw err;
        });
    }
    return this.schemaReady;
  }

  private key(kind: StoreKind, name: string) {
    return `${kind}/${name}`;
  }

  private async fetch<T>(kind: StoreKind, name: string): Promise<T | null> {
    await this.ensureSchema();
    const rows = await this.db().query<Row>("select data from documents where kind = $1 and name = $2", [kind, name]);
    return rows.length ? (rows[0].data as T) : null;
  }

  async get<T>(kind: StoreKind, name: string): Promise<T | null> {
    if (kind !== "content") return this.fetch<T>(kind, name);

    const key = this.key(kind, name);
    const hit = this.cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as T;

    // Collapse concurrent reads of the same document into one query.
    let inflight = this.pending.get(key) as Promise<T | null> | undefined;
    if (!inflight) {
      inflight = this.fetch<T>(kind, name)
        .then((value) => {
          if (value !== null) this.cache.set(key, { value, expires: Date.now() + CONTENT_TTL_MS });
          return value;
        })
        .finally(() => this.pending.delete(key));
      this.pending.set(key, inflight);
    }
    return inflight;
  }

  async createIfAbsent(kind: StoreKind, name: string, value: unknown): Promise<boolean> {
    await this.ensureSchema();
    const rows = await this.db().query<{ name: string }>(
      `insert into documents (kind, name, data, updated_at)
       values ($1, $2, $3::text::jsonb, now())
       on conflict (kind, name) do nothing
       returning name`,
      [kind, name, JSON.stringify(value)],
    );
    return rows.length === 1;
  }

  async set(kind: StoreKind, name: string, value: unknown): Promise<void> {
    await this.ensureSchema();
    // The document goes over the wire as JSON text and Postgres parses it (`::text::jsonb`):
    // drivers serialise a parameter typed as jsonb themselves, which would double-encode
    // the string (postgres.js) or turn arrays into Postgres array literals (Neon/pg).
    await this.db().query(
      `insert into documents (kind, name, data, updated_at)
       values ($1, $2, $3::text::jsonb, now())
       on conflict (kind, name) do update
         set data = excluded.data, updated_at = excluded.updated_at`,
      [kind, name, JSON.stringify(value)],
    );
    const key = this.key(kind, name);
    if (kind === "content") this.cache.set(key, { value, expires: Date.now() + CONTENT_TTL_MS });
    else this.cache.delete(key);
  }
}

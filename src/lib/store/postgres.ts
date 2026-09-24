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

/** Keep one connection pool per process, also across Next.js dev hot reloads. */
const g = globalThis as unknown as { __bloomerySql?: Sql };

function createClient(url: string): Sql {
  const max = Number(process.env.DATABASE_POOL_MAX ?? "5");
  const sslEnv = process.env.DATABASE_SSL;
  // Transaction poolers (pgbouncer, Supabase pooler) cannot use named prepared statements.
  const prepare = process.env.DATABASE_PREPARE !== "false" && !/pgbouncer=true/i.test(url);
  return postgres(url, {
    max: Number.isFinite(max) && max > 0 ? max : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare,
    ...(sslEnv === "require" ? { ssl: "require" as const } : sslEnv === "disable" ? { ssl: false } : {}),
    onnotice: () => undefined,
  });
}

export function getSql(url = process.env.DATABASE_URL): Sql {
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!g.__bloomerySql) g.__bloomerySql = createClient(url);
  return g.__bloomerySql;
}

export class PostgresStore implements DocumentStore {
  readonly name = "postgres" as const;
  private cache = new Map<string, CacheEntry>();
  private pending = new Map<string, Promise<unknown>>();
  private schemaReady: Promise<void> | null = null;

  constructor(private readonly url = process.env.DATABASE_URL) {
    if (!this.url) throw new Error("PostgresStore requires DATABASE_URL");
  }

  private sql() {
    return getSql(this.url);
  }

  /** `create table if not exists` – idempotent, runs once per process. */
  private ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = this.sql()
        .unsafe(DOCUMENTS_DDL)
        .then(() => undefined)
        .catch((err) => {
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
    const rows = await this.sql()<Row[]>`
      select data from documents where kind = ${kind} and name = ${name}
    `;
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

  async set(kind: StoreKind, name: string, value: unknown): Promise<void> {
    await this.ensureSchema();
    const sql = this.sql();
    await sql`
      insert into documents (kind, name, data, updated_at)
      values (${kind}, ${name}, ${sql.json(value as never)}, now())
      on conflict (kind, name) do update
        set data = excluded.data, updated_at = excluded.updated_at
    `;
    const key = this.key(kind, name);
    if (kind === "content") this.cache.set(key, { value, expires: Date.now() + CONTENT_TTL_MS });
    else this.cache.delete(key);
  }
}

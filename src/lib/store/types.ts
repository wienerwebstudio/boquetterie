/**
 * Document store abstraction.
 *
 * Every JSON document the shop reads or writes is addressed by a `kind` and a `name`:
 *  - `content` – editorial content, versioned in Git under `/content/*.json`
 *    (products, settings, homepage, …). Written by the admin area.
 *  - `data` – runtime data under `/data/*.json` (orders, newsletter, requests, …).
 *
 * Implementations: `json.ts` (files on disk, default) and `postgres.ts`
 * (one `documents` table, selected via `DATABASE_URL`). `src/lib/cms.ts` is the
 * only consumer – pages and components never touch a store directly.
 */
export type StoreKind = "content" | "data";

export type StoreName = "json" | "postgres";

export interface DocumentStore {
  /** Which backend this is – used for logging and the JSON fallback in cms.ts. */
  readonly name: StoreName;
  /** Returns the parsed document or `null` when it does not exist. Other errors throw. */
  get<T>(kind: StoreKind, name: string): Promise<T | null>;
  /** Creates or replaces the whole document. */
  set(kind: StoreKind, name: string, value: unknown): Promise<void>;
  /**
   * Atomically creates a document only if it does not exist yet. Returns true for the one caller that
   * created it (exactly-once claims across server instances, e.g. analytics events). Optional:
   * without it cms.ts falls back to read-then-write (fine for a single process).
   */
  createIfAbsent?(kind: StoreKind, name: string, value: unknown): Promise<boolean>;
  /** Whether runtime data can be written at all (false e.g. on a read-only serverless filesystem). */
  canWriteData(): Promise<boolean>;
}

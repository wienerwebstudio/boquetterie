import "server-only";
import { jsonStore } from "./json";
import { PostgresStore } from "./postgres";
import type { DocumentStore } from "./types";

export type { DocumentStore, StoreKind, StoreName } from "./types";
export { jsonStore } from "./json";

/**
 * Picks the datastore purely from the environment:
 *  - `DATABASE_URL` set   → Postgres (`documents` table, see docs/DATABASE.md)
 *  - otherwise            → JSON files in `/content` and `/data`
 */
const g = globalThis as unknown as { __boquetterieStore?: DocumentStore };

export function getStore(): DocumentStore {
  if (!g.__boquetterieStore) {
    const store: DocumentStore = process.env.DATABASE_URL ? new PostgresStore() : jsonStore;
    g.__boquetterieStore = store;
    const detail =
      store.name === "postgres"
        ? "DATABASE_URL is set – content falls back to /content/*.json until seeded"
        : "DATABASE_URL not set – reading /content and /data";
    console.info(`[boquetterie] datastore: ${store.name} (${detail})`);
  }
  return g.__boquetterieStore;
}

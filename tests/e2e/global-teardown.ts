import { rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The checkout and offer journeys store real orders and offers in `data/*.json` (the
 * JSON store that is used unless DATABASE_URL points at Postgres), plus "Abgebrochene Kasse" snapshots. Reset the files so
 * a test run never leaves demo orders or offers behind.
 */
export default async function globalTeardown() {
  if (process.env.DATABASE_URL) return;
  for (const name of ["orders", "offers", "checkout-drafts"]) {
    const file = path.resolve(process.cwd(), "data", `${name}.json`);
    try {
      await writeFile(file, "[]\n", "utf8");
    } catch (err) {
      console.warn(`[e2e] could not reset data/${name}.json:`, err);
    }
  }
  // Runtime documents of the Partner-Portal journey and the console-mail outbox.
  for (const name of ["partner-portal", "partner-ledger", "partner-auth-tokens", "mail-outbox"]) {
    await rm(path.resolve(process.cwd(), "data", `${name}.json`), { force: true });
  }
}

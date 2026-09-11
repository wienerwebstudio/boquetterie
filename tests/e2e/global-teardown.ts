import { writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The checkout journey stores real orders in `data/orders.json` (the JSON store
 * that is used unless DATABASE_URL points at Postgres). Reset the file so a test
 * run never leaves demo orders behind.
 */
export default async function globalTeardown() {
  if (process.env.DATABASE_URL) return;
  const file = path.resolve(process.cwd(), "data", "orders.json");
  try {
    await writeFile(file, "[]\n", "utf8");
  } catch (err) {
    console.warn("[e2e] could not reset data/orders.json:", err);
  }
}

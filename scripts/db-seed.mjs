// Imports content/*.json (kind "content") and data/*.json (kind "data") into Postgres.
//
//   npm run db:seed                 # insert missing documents, keep existing ones
//   npm run db:seed -- --force      # overwrite existing documents with the JSON files
//   npm run db:seed -- --only content|data
//
// Reads DATABASE_URL from the environment, .env.local or .env.
import path from "node:path";
import { ROOT, connect, describeUrl, ensureSchema, readJsonDir } from "./db-lib.mjs";

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;
if (only && only !== "content" && only !== "data") {
  console.error(`--only expects "content" or "data", got "${only}"`);
  process.exit(1);
}

const sql = connect();
const summary = { inserted: [], updated: [], skipped: [] };

async function upsert(kind, name, value) {
  if (force) {
    const rows = await sql`
      insert into documents (kind, name, data, updated_at)
      values (${kind}, ${name}, ${sql.json(value)}, now())
      on conflict (kind, name) do update
        set data = excluded.data, updated_at = excluded.updated_at
      returning (xmax = 0) as inserted
    `;
    (rows[0].inserted ? summary.inserted : summary.updated).push(`${kind}/${name}`);
    return;
  }
  const rows = await sql`
    insert into documents (kind, name, data)
    values (${kind}, ${name}, ${sql.json(value)})
    on conflict (kind, name) do nothing
    returning name
  `;
  (rows.length ? summary.inserted : summary.skipped).push(`${kind}/${name}`);
}

try {
  console.log(`Connecting to ${describeUrl(process.env.DATABASE_URL)} …`);
  await ensureSchema(sql);

  const kinds = only ? [only] : ["content", "data"];
  for (const kind of kinds) {
    const docs = await readJsonDir(path.join(ROOT, kind));
    if (!docs.length) console.log(`No ${kind}/*.json files found – skipping.`);
    for (const { name, value } of docs) await upsert(kind, name, value);
  }

  const list = (arr) => (arr.length ? arr.join(", ") : "–");
  console.log("");
  console.log(`Seed finished${force ? " (--force)" : ""}:`);
  console.log(`  inserted (${summary.inserted.length}): ${list(summary.inserted)}`);
  console.log(`  updated  (${summary.updated.length}): ${list(summary.updated)}`);
  console.log(`  skipped  (${summary.skipped.length}): ${list(summary.skipped)}`);
  if (summary.skipped.length && !force) console.log("  Existing documents were kept. Use --force to overwrite them.");
} catch (err) {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

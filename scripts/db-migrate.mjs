// Creates the `documents` table if it does not exist. Usage: npm run db:migrate
import { connect, describeUrl, ensureSchema } from "./db-lib.mjs";

const sql = connect();
try {
  console.log(`Connecting to ${describeUrl(process.env.DATABASE_URL)} …`);
  await ensureSchema(sql);
  const [{ count }] = await sql`select count(*)::int as count from documents`;
  console.log(`Table "documents" is ready (${count} document${count === 1 ? "" : "s"}).`);
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readData, writeData } from "@/lib/cms";
import type { AuthTokenRecord } from "@/types/auth";

/**
 * Magic-link tokens (`data/auth-tokens.json`).
 *
 * - raw token: 32 random bytes as hex (64 chars) – only ever lives in the e-mail
 * - at rest: sha256(raw) – a leaked data file cannot be used to log in
 * - 15 minutes validity, single use, expired rows are purged on every write
 */
export const TOKEN_TTL_MS = 15 * 60 * 1000;
export const TOKEN_TTL_MINUTES = TOKEN_TTL_MS / 60_000;
const FILE = "auth-tokens";
const RAW_RE = /^[0-9a-f]{64}$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

function purge(rows: AuthTokenRecord[], now: number) {
  return rows.filter((r) => Date.parse(r.expiresAt) > now);
}

/** Creates a token for the e-mail and returns the RAW token (send it, never store it). */
export async function createLoginToken(email: string, now = Date.now()) {
  const raw = randomBytes(32).toString("hex");
  const rows = purge(await readData<AuthTokenRecord[]>(FILE, []), now);
  rows.push({
    tokenHash: hashToken(raw),
    email: normalizeEmail(email),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TOKEN_TTL_MS).toISOString(),
  });
  await writeData(FILE, rows);
  return raw;
}

function find(rows: AuthTokenRecord[], raw: string, now: number): { index: number; row: AuthTokenRecord } | null {
  const hash = hashToken(raw);
  let found: { index: number; row: AuthTokenRecord } | null = null;
  // Walk every row so that the comparison cost does not depend on where a match sits.
  rows.forEach((row, index) => {
    if (safeEqual(row.tokenHash, hash) && Date.parse(row.expiresAt) > now && !found) found = { index, row };
  });
  return found;
}

export type TokenLookup = { status: "valid"; email: string } | { status: "invalid" } | { status: "expired" };

/** Checks a token WITHOUT consuming it (used to render the confirmation page). */
export async function peekLoginToken(raw: string | undefined | null, now = Date.now()): Promise<TokenLookup> {
  if (!raw || !RAW_RE.test(raw)) return { status: "invalid" };
  const rows = await readData<AuthTokenRecord[]>(FILE, []);
  const hit = find(rows, raw, now);
  if (hit) return { status: "valid", email: hit.row.email };
  // Distinguish "was valid once" from garbage so the page can word it – neither reveals whether an account exists.
  const hash = hashToken(raw);
  return rows.some((r) => safeEqual(r.tokenHash, hash)) ? { status: "expired" } : { status: "invalid" };
}

/** Validates and burns the token. Returns the e-mail it was issued for. */
export async function consumeLoginToken(raw: string | undefined | null, now = Date.now()): Promise<TokenLookup> {
  if (!raw || !RAW_RE.test(raw)) return { status: "invalid" };
  const rows = await readData<AuthTokenRecord[]>(FILE, []);
  const hit = find(rows, raw, now);
  if (!hit) {
    const hash = hashToken(raw);
    const stale = rows.some((r) => safeEqual(r.tokenHash, hash));
    const purged = purge(rows, now);
    if (purged.length !== rows.length) await writeData(FILE, purged);
    return { status: stale ? "expired" : "invalid" };
  }
  rows.splice(hit.index, 1);
  await writeData(FILE, purge(rows, now));
  return { status: "valid", email: hit.row.email };
}

import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPartnerPortalSettings, getPartners, readData, writeData } from "@/lib/cms";
import { partnerMailAddresses } from "@/lib/mail";
import type { Partner } from "@/types";
import type { PartnerPortalSettings, PartnerSessionPayload, PartnerTokenRecord } from "@/types/partner-portal";

/**
 * Partner-Portal login: magic link + signed session cookie, separate from the
 * customer login (src/lib/auth/*) and the admin cookie.
 *
 * - Token: 32 random bytes (hex) in the mail only; at rest sha256 in the runtime
 *   document `partner-auth-tokens`; 30 minutes, single use.
 * - Session cookie `bl_partner`: `<base64url(payload)>.<hex HMAC-SHA256>` with its own
 *   prefix, so neither a customer nor an admin token can ever pass as a partner one.
 *   Secret: PARTNER_SECRET, falling back to ADMIN_SECRET. 90 days, httpOnly, sameSite=lax,
 *   secure in production.
 * - Every request re-checks that the partner is active and the address is still on its
 *   allow-list – removing an address in the admin ends that session immediately.
 */
export const PARTNER_COOKIE = "bl_partner";
export const PARTNER_SESSION_SECONDS = 90 * 24 * 60 * 60;
export const PARTNER_TOKEN_TTL_MS = 30 * 60 * 1000;
export const PARTNER_TOKEN_TTL_MINUTES = PARTNER_TOKEN_TTL_MS / 60_000;
const TOKENS = "partner-auth-tokens";
const PREFIX = "blumora-partner-session:v1:";
const RAW_RE = /^[0-9a-f]{64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getPartnerSecret(): string | null {
  const secret = process.env.PARTNER_SECRET || process.env.ADMIN_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}

export const normalizePartnerEmail = (email: string) => email.trim().toLowerCase();

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

const sign = (secret: string, b64: string) => createHmac("sha256", secret).update(PREFIX + b64).digest("hex");

export function createPartnerSessionValue(secret: string, partnerId: string, email: string, now = Date.now()) {
  const payload: PartnerSessionPayload = { partnerId, email: normalizePartnerEmail(email), exp: Math.floor(now / 1000) + PARTNER_SESSION_SECONDS };
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${b64}.${sign(secret, b64)}`;
}

/** The payload when shape, signature and expiry are valid, otherwise null. */
export function verifyPartnerSessionValue(value: string | undefined | null, secret: string | null, now = Date.now()): PartnerSessionPayload | null {
  if (!value || !secret) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const b64 = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/.test(mac) || !/^[A-Za-z0-9_-]+$/.test(b64)) return null;
  if (!safeEqual(mac, sign(secret, b64))) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const { partnerId, email, exp } = payload as Partial<PartnerSessionPayload>;
  if (typeof partnerId !== "string" || !partnerId || typeof email !== "string" || !email) return null;
  if (typeof exp !== "number" || !Number.isFinite(exp) || exp * 1000 < now) return null;
  return { partnerId, email, exp };
}

export function partnerCookieOptions(maxAge = PARTNER_SESSION_SECONDS) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge };
}

/* ---------------- Allow-list ---------------- */

/** Portal login addresses: the configured list, or – until one is saved – the order-slip addresses. */
export function portalEmailsFor(partner: Pick<Partner, "emails" | "useEnvMail">, settings: PartnerPortalSettings | undefined): string[] {
  const list = settings?.emails ?? partnerMailAddresses(partner);
  return [...new Set(list.map(normalizePartnerEmail).filter((a) => EMAIL_RE.test(a)))];
}

/** The ACTIVE partner whose allow-list contains the address, or null. */
export async function findPartnerByPortalEmail(email: string): Promise<Partner | null> {
  const needle = normalizePartnerEmail(email);
  const [partners, settings] = await Promise.all([getPartners(true), getPartnerPortalSettings()]);
  return partners.find((p) => portalEmailsFor(p, settings[p.id]).includes(needle)) ?? null;
}

/* ---------------- Magic-link tokens ---------------- */

const hashToken = (raw: string) => createHash("sha256").update(raw, "utf8").digest("hex");
const purge = (rows: PartnerTokenRecord[], now: number) => rows.filter((r) => Date.parse(r.expiresAt) > now);

/** Creates a token and returns the RAW value (send it, never store it). */
export async function createPartnerLoginToken(partnerId: string, email: string, now = Date.now()) {
  const raw = randomBytes(32).toString("hex");
  const rows = purge(await readData<PartnerTokenRecord[]>(TOKENS, []), now);
  rows.push({
    tokenHash: hashToken(raw),
    partnerId,
    email: normalizePartnerEmail(email),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PARTNER_TOKEN_TTL_MS).toISOString(),
  });
  await writeData(TOKENS, rows);
  return raw;
}

export type PartnerTokenLookup = { status: "valid"; partnerId: string; email: string } | { status: "invalid" };

function findToken(rows: PartnerTokenRecord[], raw: string, now: number) {
  const hash = hashToken(raw);
  let found: { index: number; row: PartnerTokenRecord } | null = null;
  rows.forEach((row, index) => {
    if (safeEqual(row.tokenHash, hash) && Date.parse(row.expiresAt) > now && !found) found = { index, row };
  });
  return found as { index: number; row: PartnerTokenRecord } | null;
}

/** Checks a token without using it (the confirmation page). */
export async function peekPartnerLoginToken(raw: string | null | undefined, now = Date.now()): Promise<PartnerTokenLookup> {
  if (!raw || !RAW_RE.test(raw)) return { status: "invalid" };
  const hit = findToken(await readData<PartnerTokenRecord[]>(TOKENS, []), raw, now);
  return hit ? { status: "valid", partnerId: hit.row.partnerId, email: hit.row.email } : { status: "invalid" };
}

/** Validates and burns the token. */
export async function consumePartnerLoginToken(raw: string | null | undefined, now = Date.now()): Promise<PartnerTokenLookup> {
  if (!raw || !RAW_RE.test(raw)) return { status: "invalid" };
  const rows = await readData<PartnerTokenRecord[]>(TOKENS, []);
  const hit = findToken(rows, raw, now);
  if (!hit) return { status: "invalid" };
  rows.splice(hit.index, 1);
  await writeData(TOKENS, purge(rows, now));
  return { status: "valid", partnerId: hit.row.partnerId, email: hit.row.email };
}

/* ---------------- Session ---------------- */

export interface PartnerSession {
  partner: Partner;
  email: string;
}

/**
 * Resolves a session value to the partner – only while the partner is active and the
 * address is still allow-listed.
 */
export async function resolvePartnerSession(value: string | undefined | null): Promise<PartnerSession | null> {
  const payload = verifyPartnerSessionValue(value, getPartnerSecret());
  if (!payload) return null;
  const [partners, settings] = await Promise.all([getPartners(true), getPartnerPortalSettings()]);
  const partner = partners.find((p) => p.id === payload.partnerId);
  if (!partner || !portalEmailsFor(partner, settings[partner.id]).includes(payload.email)) return null;
  return { partner, email: payload.email };
}

/** The logged-in partner of the current request, or null. */
export async function getPartnerSession(): Promise<PartnerSession | null> {
  const store = await cookies();
  return resolvePartnerSession(store.get(PARTNER_COOKIE)?.value);
}

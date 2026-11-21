import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeEmail } from "./format";

/**
 * Signed unsubscribe tokens: `base64url(email).base64url(hmac)`.
 * The HMAC key is derived from ADMIN_SECRET (else AUTH_SECRET) with a fixed context,
 * so a token never doubles as a session signature. No expiry – an unsubscribe link
 * must keep working.
 */

const CONTEXT = "blumora-outreach-unsubscribe-v1";

export function outreachSecret(env: Record<string, string | undefined> = process.env): string | null {
  const s = env.ADMIN_SECRET?.trim() || env.AUTH_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

function sign(email: string, secret: string) {
  const key = createHmac("sha256", secret).update(CONTEXT).digest();
  return createHmac("sha256", key).update(normalizeEmail(email)).digest("base64url").slice(0, 32);
}

export function unsubscribeToken(email: string, secret: string): string {
  return `${Buffer.from(normalizeEmail(email)).toString("base64url")}.${sign(email, secret)}`;
}

/** The address of a valid token, else null. */
export function verifyUnsubscribeToken(token: string | null | undefined, secret: string | null): string | null {
  if (!token || !secret || token.length > 600) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  let email: string;
  try {
    email = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email.includes("@")) return null;
  const expected = Buffer.from(sign(email, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? normalizeEmail(email) : null;
}

/** Random per-send tracking token (URL-safe). */
export function trackingToken() {
  return randomBytes(18).toString("base64url");
}

export function newId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

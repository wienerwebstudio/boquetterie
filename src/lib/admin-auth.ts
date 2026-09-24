/**
 * Admin session helpers – edge-safe (Web Crypto only, no Node imports).
 *
 * The admin area is protected by a single signed cookie. The cookie value is
 * `<expiresAt>.<hex HMAC-SHA256(secret, payload(expiresAt))>`. The secret is
 * ADMIN_SECRET (falls back to ADMIN_PASSWORD so a single env var is enough).
 */
export const ADMIN_COOKIE = "bl_admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60; // 12h

const PAYLOAD_PREFIX = "bloomery-admin-session:v1:";

export function getAdminSecret(): string | null {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  return secret && secret.length > 0 ? secret : null;
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD) && Boolean(getAdminSecret());
}

async function hmacHex(secret: string, payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (byte-wise). */
export function timingSafeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ba.length ^ bb.length;
  const len = Math.max(ba.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

/** Create a session token valid for ADMIN_SESSION_SECONDS. */
export async function createSessionToken(secret: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_SECONDS;
  const mac = await hmacHex(secret, PAYLOAD_PREFIX + expiresAt);
  return `${expiresAt}.${mac}`;
}

/** Verify a token: shape, expiry and signature (timing-safe). */
export async function verifySessionToken(token: string | undefined | null, secret: string | null, now = Date.now()) {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = Number(token.slice(0, dot));
  const mac = token.slice(dot + 1);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < now) return false;
  if (!/^[0-9a-f]{64}$/.test(mac)) return false;
  const expected = await hmacHex(secret, PAYLOAD_PREFIX + expiresAt);
  return timingSafeEqual(mac, expected);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  };
}

/** Only allow redirects inside the admin area. */
export function safeAdminRedirect(next: string | null | undefined) {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.startsWith("/admin/login")) return "/admin";
  return next;
}

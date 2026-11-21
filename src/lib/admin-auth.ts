/**
 * Admin session helpers – edge-safe (Web Crypto only, no Node imports).
 *
 * The admin area is protected by a single signed cookie. The cookie value is
 * `<expiresAt>.<hex HMAC-SHA256(key, payload(expiresAt))>`. The key is derived
 * from ADMIN_SECRET, or from ADMIN_PASSWORD when no secret is set (a single env
 * var is enough) – the raw value is never used as the signing key itself.
 */
export const ADMIN_COOKIE = "bl_admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60; // 12h

const PAYLOAD_PREFIX = "blumora-admin-session:v1:";
/** Fixed context of the key derivation – changing it logs everyone out. */
const KEY_CONTEXT = "blumora-admin-session-key:v1";

export const ADMIN_PASSWORD_MIN_LENGTH = 10;

/** Placeholder and textbook passwords, compared without case and punctuation (`Change-Me!` = `changeme`). */
const DEFAULT_PASSWORDS = new Set([
  "changeme", "changeit", "admin", "administrator", "adminadmin", "adminpassword", "password", "passwort", "passw0rd",
  "secret", "default", "letmein", "welcome", "blumora", "blumoraadmin", "test", "test1234", "testtest",
  "qwertyuiop", "1234567890", "0123456789", "12345678910",
]);

export type AdminPasswordProblem = "missing" | "default" | "short";

/**
 * Why a password may not be used for the admin login, or null when it is fine.
 * A missing password is always a problem. In production a placeholder such as
 * the `change-me` from `.env.example`, a well-known default or anything shorter
 * than ADMIN_PASSWORD_MIN_LENGTH is refused as well: the admin then stays
 * locked instead of being open with a guessable password. Development and
 * tests accept any non-empty password.
 */
export function adminPasswordProblem(
  password: string | undefined | null = process.env.ADMIN_PASSWORD,
  production = process.env.NODE_ENV === "production",
): AdminPasswordProblem | null {
  if (!password || password.trim() === "") return "missing";
  if (!production) return null;
  if (DEFAULT_PASSWORDS.has(password.toLowerCase().replace(/[^a-z0-9]/g, ""))) return "default";
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) return "short";
  return null;
}

let warnedAboutPassword = false;

/** The configured admin password, or null when it is missing or refused (see adminPasswordProblem). */
export function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  const problem = adminPasswordProblem(password);
  if (!problem) return password ?? null;
  if (problem !== "missing" && !warnedAboutPassword) {
    warnedAboutPassword = true;
    console.error(
      `[admin] ADMIN_PASSWORD is ${problem === "default" ? "a known default value" : `shorter than ${ADMIN_PASSWORD_MIN_LENGTH} characters`} – the admin login is disabled in production until a real password is set.`,
    );
  }
  return null;
}

/**
 * Secret the session key is derived from: ADMIN_SECRET, else ADMIN_PASSWORD.
 * Null without a usable password – nobody can log in then, so no cookie is accepted either.
 */
export function getAdminSecret(): string | null {
  const password = getAdminPassword();
  if (!password) return null;
  return process.env.ADMIN_SECRET || password;
}

export function isAdminConfigured() {
  return getAdminSecret() !== null;
}

const hmacParams = { name: "HMAC", hash: "SHA-256" } as const;

/**
 * Signing key = HMAC-SHA256(KEY_CONTEXT, secret) (an HKDF-style extract step).
 * It separates the cookie key from the secret itself: with only ADMIN_PASSWORD
 * set, the password is not the HMAC key. It does not make a weak password
 * stronger – set a random ADMIN_SECRET for that.
 */
async function signingKey(secret: string) {
  const enc = new TextEncoder();
  const context = await crypto.subtle.importKey("raw", enc.encode(KEY_CONTEXT), hmacParams, false, ["sign"]);
  const derived = await crypto.subtle.sign("HMAC", context, enc.encode(secret));
  return crypto.subtle.importKey("raw", derived, hmacParams, false, ["sign"]);
}

async function hmacHex(secret: string, payload: string) {
  const sig = await crypto.subtle.sign("HMAC", await signingKey(secret), new TextEncoder().encode(payload));
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

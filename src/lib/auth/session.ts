import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SessionPayload } from "@/types/auth";

/**
 * Customer session cookie.
 *
 * Value: `<base64url(JSON payload)>.<hex HMAC-SHA256(secret, PREFIX + payloadB64)>`.
 * The payload only carries a customer id and an expiry – never the e-mail or
 * profile data. The signing secret is AUTH_SECRET, falling back to ADMIN_SECRET.
 * A separate prefix guarantees that a customer token can never pass as an admin
 * token (and vice versa) even when both share one secret.
 */
export const SESSION_COOKIE = "bl_session";
export const SESSION_SECONDS = 30 * 24 * 60 * 60; // 30 days

const PAYLOAD_PREFIX = "bloomery-customer-session:v1:";

export function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET || process.env.ADMIN_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}

/** True when magic-link login can work at all (a signing secret is configured). */
export function isAuthConfigured() {
  return getAuthSecret() !== null;
}

function sign(secret: string, payloadB64: string) {
  return createHmac("sha256", secret).update(PAYLOAD_PREFIX + payloadB64).digest("hex");
}

function safeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

export function createSessionValue(secret: string, customerId: string, now = Date.now()) {
  const payload: SessionPayload = { customerId, exp: Math.floor(now / 1000) + SESSION_SECONDS };
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${b64}.${sign(secret, b64)}`;
}

/** Returns the payload when shape, signature and expiry are valid, otherwise null. */
export function verifySessionValue(value: string | undefined | null, secret: string | null, now = Date.now()): SessionPayload | null {
  if (!value || !secret) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const b64 = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/.test(mac) || !/^[A-Za-z0-9_-]+$/.test(b64)) return null;
  if (!safeEqualHex(mac, sign(secret, b64))) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const { customerId, exp } = payload as Partial<SessionPayload>;
  if (typeof customerId !== "string" || !customerId || typeof exp !== "number" || !Number.isFinite(exp)) return null;
  if (exp * 1000 < now) return null;
  return { customerId, exp };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

export function clearedSessionCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 };
}

import "server-only";
import { isIP } from "node:net";

/**
 * Minimal in-memory rate limiter (sliding window per key).
 *
 * The buckets live in the memory of ONE process. On a single long-running
 * container that is a real limit; on serverless hosts every instance counts on
 * its own and forgets everything on a cold start, so the limits are best
 * effort there. For a hard guarantee swap the `buckets` map for a shared store
 * (Redis/Upstash, Postgres) – the `rateLimit()` signature stays the same.
 * See docs/SECURITY.md.
 */
interface Bucket {
  hits: number[];
  /** Time after which the bucket holds no relevant hit any more. */
  expiresAt: number;
}

/** Insertion order = least recently used first (entries are re-inserted on every access). */
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;
/** When full and nothing has expired, the oldest entries are dropped down to this size. */
const EVICT_TO = Math.floor(MAX_KEYS * 0.9);

export interface RateLimitOptions {
  /** Logical name, e.g. "newsletter" – keeps limits separate per endpoint. */
  scope: string;
  /** Max requests per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Makes room for a new key: drops expired buckets first and, only if that is
 * not enough, the least recently used ones. Never wipes the whole map – a
 * client that is currently blocked was touched recently and stays blocked.
 */
function evict(now: number) {
  for (const [id, bucket] of buckets) {
    if (bucket.expiresAt <= now) buckets.delete(id);
  }
  if (buckets.size < MAX_KEYS) return;
  for (const id of buckets.keys()) {
    if (buckets.size <= EVICT_TO) break;
    buckets.delete(id);
  }
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const id = `${opts.scope}:${key}`;
  const existing = buckets.get(id);
  if (existing) buckets.delete(id); // re-inserted below → moves to the "recently used" end
  else if (buckets.size >= MAX_KEYS) evict(now);

  const hits = existing ? existing.hits.filter((t) => now - t < opts.windowMs) : [];
  if (hits.length >= opts.limit) {
    const oldest = hits[0];
    buckets.set(id, { hits, expiresAt: hits[hits.length - 1] + opts.windowMs });
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000)) };
  }
  hits.push(now);
  buckets.set(id, { hits, expiresAt: now + opts.windowMs });
  return { ok: true, remaining: opts.limit - hits.length, retryAfterSeconds: 0 };
}

/** Forgets the hits of one key, e.g. the failed admin logins of an IP after a successful one. */
export function resetRateLimit(key: string, scope: string) {
  buckets.delete(`${scope}:${key}`);
}

/**
 * Returns the address in a canonical form, or null when the value is not an IP.
 * Accepts `1.2.3.4`, `1.2.3.4:5678`, `[2001:db8::1]:443`, `::ffff:1.2.3.4`.
 * IPv6 is reduced to its /64 prefix: a single customer line owns the whole /64
 * and could otherwise rotate through 2^64 addresses.
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = raw.trim().toLowerCase();
  if (!v || v.length > 64) return null;
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(v);
  if (bracketed) v = bracketed[1];
  else if (/^[\d.]+:\d+$/.test(v)) v = v.slice(0, v.lastIndexOf(":"));
  const zone = v.indexOf("%");
  if (zone >= 0) v = v.slice(0, zone);
  if (v.startsWith("::ffff:") && isIP(v.slice(7)) === 4) v = v.slice(7);

  const family = isIP(v);
  if (family === 4) return v;
  if (family !== 6) return null;

  // Expand `::` far enough to read the first four groups (the /64 prefix).
  const [head, tail] = v.split("::");
  const groups = head ? head.split(":") : [];
  if (tail !== undefined) {
    const tailGroups = tail ? tail.split(":") : [];
    // A dotted IPv4 tail (`64:ff9b::1.2.3.4`) stands for two groups.
    const tailLength = tailGroups.length + (tail.includes(".") ? 1 : 0);
    for (let i = groups.length + tailLength; i < 8; i++) groups.push("0");
    groups.push(...tailGroups);
  }
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

const NETLIFY_IP_HEADER = "x-nf-client-connection-ip";

/**
 * Header the hosting platform sets to the real client address and that a
 * client cannot override. Only such a header may be trusted blindly:
 *  - `TRUSTED_IP_HEADER` names it explicitly (e.g. `cf-connecting-ip` behind Cloudflare);
 *  - on Netlify it is `x-nf-client-connection-ip`. `NETLIFY` only exists while
 *    building, so next.config.ts bakes the choice into `BUILD_TRUSTED_IP_HEADER`.
 * Everywhere else such a header would simply be passed through from the
 * client, so none is trusted.
 */
function trustedIpHeader(): string | null {
  const name = process.env.TRUSTED_IP_HEADER
    || process.env.BUILD_TRUSTED_IP_HEADER
    || (process.env.NETLIFY === "true" ? NETLIFY_IP_HEADER : "");
  return name ? name.trim().toLowerCase() : null;
}

/**
 * Client identifier for rate limiting. Order:
 *  1. the platform header from `trustedIpHeader()` (Netlify, or configured);
 *  2. the LAST entry of `X-Forwarded-For` – the one appended by the proxy that
 *     talks to us. Everything left of it is whatever the client sent, so the
 *     first entry (the old behaviour) could be chosen freely by an attacker;
 *  3. `X-Real-IP`, only when there is no usable `X-Forwarded-For` (Caddy, for
 *     example, forwards a client-supplied `X-Real-IP` untouched);
 *  4. one shared bucket.
 * Without any proxy in front of Node all of these come from the client – see docs/SECURITY.md.
 */
export function clientKey(req: Request) {
  const trusted = trustedIpHeader();
  if (trusted) {
    const ip = normalizeIp(req.headers.get(trusted));
    if (ip) return ip;
  }
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = normalizeIp(forwarded.slice(forwarded.lastIndexOf(",") + 1));
    if (ip) return ip;
  }
  return normalizeIp(req.headers.get("x-real-ip")) ?? "anonymous";
}

/** Returns a 429 Response when the limit is exceeded, otherwise null. */
export function enforceRateLimit(req: Request, opts: RateLimitOptions): Response | null {
  const res = rateLimit(clientKey(req), opts);
  if (res.ok) return null;
  return new Response(JSON.stringify({ ok: false, message: "Zu viele Anfragen. Bitte versuch es in Kürze noch einmal." }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(res.retryAfterSeconds) },
  });
}

/** Test hooks – not for application code. */
export const rateLimitInternals = {
  maxKeys: MAX_KEYS,
  evictTo: EVICT_TO,
  size: () => buckets.size,
  has: (key: string, scope: string) => buckets.has(`${scope}:${key}`),
  clear: () => buckets.clear(),
};

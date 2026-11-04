import "server-only";

/**
 * Minimal in-memory rate limiter (sliding window per key).
 *
 * Good enough for a single Node process (self-hosted / one container). For
 * multi-instance or serverless deployments swap the store for Redis/Upstash –
 * the `rateLimit()` signature stays the same.
 */
interface Bucket { hits: number[]; }
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

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

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const id = `${opts.scope}:${key}`;
  if (!buckets.has(id) && buckets.size >= MAX_KEYS) buckets.clear();
  const bucket = buckets.get(id) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);
  if (bucket.hits.length >= opts.limit) {
    buckets.set(id, bucket);
    const oldest = bucket.hits[0];
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000)) };
  }
  bucket.hits.push(now);
  buckets.set(id, bucket);
  return { ok: true, remaining: opts.limit - bucket.hits.length, retryAfterSeconds: 0 };
}

/** Best-effort client identifier behind proxies. */
export function clientKey(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";
  return ip;
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

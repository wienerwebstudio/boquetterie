import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { clientKey, enforceRateLimit, normalizeIp, rateLimit, rateLimitInternals, resetRateLimit } from "@/lib/rate-limit";

const request = (headers: Record<string, string> = {}) => new Request("https://shop.test/api/x", { headers });
const opts = { scope: "test", limit: 3, windowMs: 60_000 };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  rateLimitInternals.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("normalizeIp", () => {
  it("accepts IPv4, with or without a port", () => {
    expect(normalizeIp(" 203.0.113.7 ")).toBe("203.0.113.7");
    expect(normalizeIp("203.0.113.7:51234")).toBe("203.0.113.7");
    expect(normalizeIp("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("reduces IPv6 to its /64 prefix", () => {
    expect(normalizeIp("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).toBe("2001:db8:1:2::/64");
    expect(normalizeIp("2001:0DB8:0001:0002::1")).toBe("2001:db8:1:2::/64");
    expect(normalizeIp("[2001:db8:1:2::9]:443")).toBe("2001:db8:1:2::/64");
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(normalizeIp("::1")).toBe("0:0:0:0::/64");
    expect(normalizeIp("64:ff9b::203.0.113.7")).toBe("64:ff9b:0:0::/64");
    expect(normalizeIp("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("rejects everything that is not an address", () => {
    for (const bad of ["", "   ", "unknown", "999.1.1.1", "1.2.3", "evil<script>", "2001:db8:::1", "x".repeat(200), null, undefined]) {
      expect(normalizeIp(bad)).toBeNull();
    }
  });
});

describe("clientKey", () => {
  it("uses the last X-Forwarded-For entry, not the client-controlled first one", () => {
    expect(clientKey(request({ "x-forwarded-for": "6.6.6.6, 10.0.0.1, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientKey(request({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("cannot be rotated by sending a different spoofed first entry each time", () => {
    const keys = new Set([1, 2, 3].map((n) => clientKey(request({ "x-forwarded-for": `1.1.1.${n}, 203.0.113.7` }))));
    expect([...keys]).toEqual(["203.0.113.7"]);
  });

  it("prefers X-Forwarded-For over a (possibly client-supplied) X-Real-IP", () => {
    expect(clientKey(request({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "6.6.6.6" }))).toBe("203.0.113.7");
  });

  it("falls back to X-Real-IP, then to one shared bucket", () => {
    expect(clientKey(request({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientKey(request({ "x-forwarded-for": "garbage", "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientKey(request({ "x-forwarded-for": "garbage" }))).toBe("anonymous");
    expect(clientKey(request())).toBe("anonymous");
  });

  it("ignores the Netlify header unless the app runs on Netlify", () => {
    const req = request({ "x-nf-client-connection-ip": "6.6.6.6", "x-forwarded-for": "203.0.113.7" });
    expect(clientKey(req)).toBe("203.0.113.7");
  });

  it("prefers the Netlify header on Netlify (build flag or NETLIFY=true)", () => {
    const req = request({ "x-nf-client-connection-ip": "198.51.100.9", "x-forwarded-for": "6.6.6.6, 10.0.0.1", "x-real-ip": "6.6.6.6" });
    vi.stubEnv("BUILD_TRUSTED_IP_HEADER", "x-nf-client-connection-ip");
    expect(clientKey(req)).toBe("198.51.100.9");
    vi.unstubAllEnvs();
    vi.stubEnv("NETLIFY", "true");
    expect(clientKey(req)).toBe("198.51.100.9");
    // Header missing on Netlify → normal fallback chain.
    expect(clientKey(request({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("honours an explicit TRUSTED_IP_HEADER", () => {
    vi.stubEnv("TRUSTED_IP_HEADER", "CF-Connecting-IP");
    expect(clientKey(request({ "cf-connecting-ip": "198.51.100.20", "x-forwarded-for": "203.0.113.7" }))).toBe("198.51.100.20");
    expect(clientKey(request({ "cf-connecting-ip": "not-an-ip", "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });
});

describe("rateLimit", () => {
  it("allows `limit` requests per window and then blocks", () => {
    expect(rateLimit("a", opts)).toEqual({ ok: true, remaining: 2, retryAfterSeconds: 0 });
    expect(rateLimit("a", opts).remaining).toBe(1);
    expect(rateLimit("a", opts).remaining).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(rateLimit("a", opts)).toEqual({ ok: false, remaining: 0, retryAfterSeconds: 50 });
  });

  it("keeps keys and scopes apart", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", opts);
    expect(rateLimit("a", opts).ok).toBe(false);
    expect(rateLimit("b", opts).ok).toBe(true);
    expect(rateLimit("a", { ...opts, scope: "other" }).ok).toBe(true);
  });

  it("opens again once the window has passed (sliding)", () => {
    rateLimit("a", opts); // t = 0
    vi.advanceTimersByTime(30_000);
    rateLimit("a", opts); // t = 30 s
    rateLimit("a", opts);
    expect(rateLimit("a", opts).ok).toBe(false);
    vi.advanceTimersByTime(30_000); // t = 60 s → the first hit left the window
    expect(rateLimit("a", opts).ok).toBe(true);
    expect(rateLimit("a", opts).ok).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(rateLimit("a", opts)).toEqual({ ok: true, remaining: 2, retryAfterSeconds: 0 });
  });

  it("does not extend the block by hammering a blocked key", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", opts);
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(1_000);
      expect(rateLimit("a", opts).ok).toBe(false);
    }
    vi.advanceTimersByTime(40_000);
    expect(rateLimit("a", opts).ok).toBe(true);
  });

  it("resetRateLimit forgets one key only", () => {
    for (let i = 0; i < 3; i++) { rateLimit("a", opts); rateLimit("b", opts); }
    resetRateLimit("a", opts.scope);
    expect(rateLimit("a", opts).ok).toBe(true);
    expect(rateLimit("b", opts).ok).toBe(false);
  });
});

describe("eviction", () => {
  const { maxKeys, evictTo } = rateLimitInternals;
  const fill = (count: number, prefix = "k") => {
    for (let i = 0; i < count; i++) rateLimit(`${prefix}${i}`, opts);
  };

  it("never grows beyond the cap", () => {
    fill(maxKeys + 500);
    expect(rateLimitInternals.size()).toBeLessThanOrEqual(maxKeys);
  });

  it("drops expired buckets first and keeps the live ones", () => {
    fill(maxKeys - 1, "old");
    vi.advanceTimersByTime(opts.windowMs + 1);
    rateLimit("live", opts);
    expect(rateLimitInternals.size()).toBe(maxKeys);
    rateLimit("new", opts); // full → sweep
    expect(rateLimitInternals.size()).toBe(2);
    expect(rateLimitInternals.has("live", opts.scope)).toBe(true);
    expect(rateLimitInternals.has("new", opts.scope)).toBe(true);
  });

  it("evicts the least recently used keys when nothing has expired – a blocked client stays blocked", () => {
    for (let i = 0; i < 3; i++) rateLimit("attacker", opts);
    fill(maxKeys - 1, "k");
    expect(rateLimit("attacker", opts).ok).toBe(false); // touched → most recently used
    rateLimit("overflow", opts); // full, nothing expired → oldest keys go
    expect(rateLimitInternals.size()).toBe(evictTo + 1);
    expect(rateLimitInternals.has("k0", opts.scope)).toBe(false);
    expect(rateLimitInternals.has(`k${maxKeys - 2}`, opts.scope)).toBe(true);
    expect(rateLimit("attacker", opts).ok).toBe(false);
  });
});

describe("enforceRateLimit", () => {
  it("returns null while allowed and a 429 with Retry-After afterwards", async () => {
    const req = () => request({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" });
    const o = { scope: "enforce", limit: 2, windowMs: 60_000 };
    expect(enforceRateLimit(req(), o)).toBeNull();
    expect(enforceRateLimit(req(), o)).toBeNull();
    const blocked = enforceRateLimit(req(), o);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("retry-after")).toBe("60");
    expect(await blocked?.json()).toMatchObject({ ok: false });
    // Changing the spoofable part of the header does not open a new bucket …
    expect(enforceRateLimit(request({ "x-forwarded-for": "7.7.7.7, 203.0.113.7" }), o)?.status).toBe(429);
    // … a different real client is unaffected.
    expect(enforceRateLimit(request({ "x-forwarded-for": "203.0.113.8" }), o)).toBeNull();
  });
});

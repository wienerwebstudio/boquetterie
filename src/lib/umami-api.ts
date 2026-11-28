import "server-only";

/**
 * Optional read access to Umami (traffic + event funnel) for /admin/analytics.
 * Env-activated: UMAMI_API_KEY (Umami Cloud → Settings → API keys) + NEXT_PUBLIC_UMAMI_WEBSITE_ID;
 * UMAMI_API_URL defaults to Umami Cloud (https://api.umami.is/v1). Without a key, or when Umami
 * does not answer, every function returns null and the dashboards show only the shop's own data.
 */

const KEY = process.env.UMAMI_API_KEY;
const WEBSITE = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const BASE = (process.env.UMAMI_API_URL || "https://api.umami.is/v1").replace(/\/$/, "");

export const umamiConfigured = () => Boolean(KEY && WEBSITE);

async function get<T>(path: string, params: Record<string, string | number>): Promise<T | null> {
  if (!KEY || !WEBSITE) return null;
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  try {
    const res = await fetch(`${BASE}/websites/${WEBSITE}${path}?${qs}`, {
      headers: { "x-umami-api-key": KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[umami-api] ${path}: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[umami-api] ${path} failed`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Umami returns either plain numbers or `{ value, prev }` depending on the version. */
const num = (v: unknown) => (typeof v === "number" ? v : v && typeof v === "object" && typeof (v as { value?: unknown }).value === "number" ? (v as { value: number }).value : 0);

export interface UmamiStats { visitors: number; visits: number; pageviews: number }

export async function getStats(startAt: number, endAt: number): Promise<UmamiStats | null> {
  const s = await get<Record<string, unknown>>("/stats", { startAt, endAt });
  return s ? { visitors: num(s.visitors), visits: num(s.visits), pageviews: num(s.pageviews) } : null;
}

export type MetricType = "referrer" | "language" | "event" | "country" | "device" | "url";

/** Top values of a metric: [{ x: "google.com", y: 12 }]. */
export async function getMetric(type: MetricType, startAt: number, endAt: number, limit = 50): Promise<{ x: string; y: number }[] | null> {
  const rows = await get<{ x: string | null; y: number }[]>("/metrics", { type, startAt, endAt, limit });
  return Array.isArray(rows) ? rows.map((r) => ({ x: r.x ?? "", y: num(r.y) })) : null;
}

/** Period from a Vienna date ("YYYY-MM-DD", start of day) until now, in ms for the Umami API. */
export function umamiRange(fromDate: string): { startAt: number; endAt: number } {
  // Start of the day in Vienna (UTC+1/+2): two hours earlier covers both offsets.
  return { startAt: Date.parse(`${fromDate}T00:00:00Z`) - 2 * 3600_000, endAt: Date.now() };
}

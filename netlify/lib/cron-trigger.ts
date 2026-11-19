/**
 * Shared by the Netlify scheduled functions in netlify/functions/: calls one of the
 * shop's cron endpoints (`/api/cron/*`) on the published site with
 * `Authorization: Bearer $CRON_SECRET`. The endpoint does the work; this only
 * triggers it on schedule. See docs/MAIL.md → "Netlify".
 *
 * Kept free of Netlify-specific imports so the unit tests can call it directly.
 */

/** The bits of Netlify's function context that are used here. */
export interface CronContext {
  site?: { url?: string };
}

export interface CronTriggerResult {
  ok: boolean;
  /** "skipped" when CRON_SECRET or the site URL is missing. */
  status: number | "skipped" | "error";
  body?: unknown;
}

type Env = Record<string, string | undefined>;
type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Base URL of the published site: Netlify's `context.site.url` (the primary domain,
 * e.g. https://blumora.at), else the `URL` variable Netlify sets for functions, else
 * NEXT_PUBLIC_SITE_URL.
 */
export function cronBaseUrl(context: CronContext | undefined, env: Env): string | null {
  const raw = context?.site?.url || env.URL || env.NEXT_PUBLIC_SITE_URL || "";
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return null;
  }
}

export async function triggerCron(
  path: "/api/cron/review-requests" | "/api/cron/reminders" | "/api/cron/partner-reminders" | "/api/cron/outreach",
  context: CronContext | undefined,
  { env = process.env as Env, fetchImpl = fetch as Fetch, log = console }: { env?: Env; fetchImpl?: Fetch; log?: Pick<Console, "log" | "error"> } = {},
): Promise<CronTriggerResult> {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) {
    log.error(`[cron] ${path}: CRON_SECRET ist nicht gesetzt – nichts aufgerufen. Bitte in Netlify unter Project configuration → Environment variables den Wert CRON_SECRET (Scope: Functions) anlegen und neu deployen.`);
    return { ok: false, status: "skipped" };
  }
  const base = cronBaseUrl(context, env);
  if (!base) {
    log.error(`[cron] ${path}: keine Website-Adresse gefunden (context.site.url, URL, NEXT_PUBLIC_SITE_URL) – nichts aufgerufen.`);
    return { ok: false, status: "skipped" };
  }
  try {
    const res = await fetchImpl(`${base}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      // Scheduled functions may run 30 s; leave room to log the outcome.
      signal: AbortSignal.timeout(25_000),
    });
    const body = await res.json().catch(() => null);
    if (res.ok) log.log(`[cron] ${path}: ${res.status}`, JSON.stringify(body));
    else log.error(`[cron] ${path}: HTTP ${res.status}`, JSON.stringify(body));
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    log.error(`[cron] ${path}: Aufruf fehlgeschlagen`, err instanceof Error ? err.message : err);
    return { ok: false, status: "error" };
  }
}

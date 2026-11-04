/**
 * Optional password lock for the whole public site, for the time before launch.
 * Active only when SITE_PASSWORD is set. Uses HTTP Basic Auth, so the browser asks
 * once and remembers it; any user name is accepted, only the password counts.
 *
 * Webhooks and cron endpoints stay reachable: they are called by Stripe, PayPal and
 * the scheduler, which cannot type a password, and they check their own secrets.
 */
const OPEN_PREFIXES = ["/api/webhooks/", "/api/cron/"];

export function siteLockPassword(): string | null {
  const value = process.env.SITE_PASSWORD?.trim();
  return value ? value : null;
}

export function isOpenPath(pathname: string): boolean {
  return OPEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Compares in constant time so the response time does not reveal how much matched. */
function safeEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function isUnlocked(authorization: string | null, password: string): boolean {
  if (!authorization?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(authorization.slice(6).trim());
  } catch {
    return false;
  }
  const colon = decoded.indexOf(":");
  if (colon < 0) return false;
  return safeEqual(decoded.slice(colon + 1), password);
}

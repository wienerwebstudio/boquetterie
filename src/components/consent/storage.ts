import {
  CONSENT_COOKIE_NAME, CONSENT_MAX_AGE_DAYS, CONSENT_STORAGE_KEY, CONSENT_VERSION,
  type ConsentChoice, type ConsentState,
} from "@/types/consent";

/**
 * Parses a stored value (localStorage or cookie). Returns null when the value is
 * missing, malformed or was written by an older consent version – in all of
 * those cases the visitor is asked again.
 */
export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ConsentState> | null;
    if (!v || typeof v !== "object") return null;
    if (v.version !== CONSENT_VERSION) return null;
    if (typeof v.analytics !== "boolean" || typeof v.marketing !== "boolean") return null;
    return {
      necessary: true,
      analytics: v.analytics,
      marketing: v.marketing,
      version: CONSENT_VERSION,
      updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function createConsent(choice: ConsentChoice): ConsentState {
  return { necessary: true, analytics: choice.analytics, marketing: choice.marketing, version: CONSENT_VERSION, updatedAt: new Date().toISOString() };
}

function readCookie(name: string): string | null {
  try {
    const entry = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
    return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
}

/** localStorage first, cookie as fallback (e.g. after the storage was cleared). */
export function readStoredConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    raw = null;
  }
  return parseConsent(raw) ?? parseConsent(readCookie(CONSENT_COOKIE_NAME));
}

/** Writes localStorage and the mirror cookie. Both are best-effort (private mode, blocked cookies). */
export function persistConsent(consent: ConsentState) {
  const json = JSON.stringify(consent);
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, json);
  } catch {
    /* quota / private mode – the cookie still carries the choice */
  }
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(json)}; Path=/; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`;
  } catch {
    /* cookies blocked – localStorage still carries the choice */
  }
}

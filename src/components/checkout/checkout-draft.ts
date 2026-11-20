/**
 * "Abgebrochene Kasse" in the browser: a random draft id per checkout session
 * (sessionStorage) and a best-effort snapshot POST to `/api/checkout/draft`. The id is
 * sent with the order request, so the server deletes the snapshot once the order exists.
 */

const STORAGE_KEY = "blumora-checkout-draft";

function session(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID().replace(/-/g, "");
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 40);
  }
}

/** The draft id of `scope` ("checkout", "express-product", "express-cart"); created on first use. */
export function draftId(scope: string): string {
  const store = session();
  const key = `${STORAGE_KEY}:${scope}`;
  try {
    const existing = store?.getItem(key);
    if (existing && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) return existing;
  } catch { /* private mode */ }
  const id = randomId();
  try { store?.setItem(key, id); } catch { /* private mode */ }
  return id;
}

/** The stored id of `scope` without creating one. */
export function peekDraftId(scope: string): string | undefined {
  try {
    return session()?.getItem(`${STORAGE_KEY}:${scope}`) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Forget the id (the order exists – a later snapshot gets a new id). */
export function clearDraftId(scope: string) {
  try { session()?.removeItem(`${STORAGE_KEY}:${scope}`); } catch { /* ignore */ }
}

/** Fire-and-forget snapshot; never throws, never blocks the checkout. */
export function postDraft(body: Record<string, unknown>) {
  try {
    void fetch("/api/checkout/draft", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify(body),
    }).catch(() => undefined);
  } catch { /* ignore */ }
}

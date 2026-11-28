/**
 * Marketing attribution: where a visit came from, as a coarse channel. Pure and client-safe;
 * unit tested in tests/unit/attribution.test.ts. Used by the browser (first touch of the visit)
 * and stored on the order (`order.analytics`) so revenue can be grouped by channel without
 * relying on the analytics tool.
 */

export const CHANNELS = [
  "chatgpt", "perplexity", "gemini", "copilot", "google", "google_ads", "bing", "instagram", "facebook", "tiktok",
  "whatsapp", "trustpilot", "email", "referral", "direct",
] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  chatgpt: "ChatGPT", perplexity: "Perplexity", gemini: "Gemini", copilot: "Copilot", google: "Google (organisch)",
  google_ads: "Google Ads", bing: "Bing", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
  whatsapp: "WhatsApp", trustpilot: "Trustpilot", email: "E-Mail", referral: "Andere Website", direct: "Direkt / unbekannt",
};

export interface TouchInput {
  /** document.referrer of the landing page view ("" when none). */
  referrer: string;
  /** Full landing URL (for utm_* and click ids). */
  url: string;
  /** Own hostnames – a referrer from them counts as direct. */
  ownHosts?: string[];
}

export interface Attribution {
  channel: Channel;
  referrer_domain?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  /** Path of the landing page (no query). */
  landing?: string;
}

const clip = (s: string | null | undefined, n = 80) => (s ? s.trim().slice(0, n) : undefined) || undefined;

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

const is = (host: string, ...names: string[]) => names.some((n) => host === n || host.endsWith(`.${n}`));

/** Channel from a utm_source / referrer host / medium. */
export function classifyChannel(source: string, host: string, medium: string, params: URLSearchParams): Channel {
  const s = `${source} ${host}`.toLowerCase();
  if (params.has("gclid") || params.has("gbraid") || params.has("wbraid") || (/google/.test(s) && /cpc|ppc|paid/.test(medium))) return "google_ads";
  if (/chatgpt|openai/.test(s)) return "chatgpt";
  if (/perplexity/.test(s)) return "perplexity";
  if (/gemini|bard/.test(s)) return "gemini";
  if (/copilot/.test(s)) return "copilot";
  if (/(^|\W)ig(\W|$)|instagram/.test(s)) return "instagram";
  if (params.has("fbclid") || /facebook|(^|\W)fb(\W|$)|fb\.com|messenger/.test(s)) return "facebook";
  if (/tiktok/.test(s)) return "tiktok";
  if (/whatsapp|wa\.me/.test(s)) return "whatsapp";
  if (/trustpilot/.test(s)) return "trustpilot";
  if (/mail|newsletter/.test(medium) || /mail\.|outlook|gmx|newsletter/.test(s)) return "email";
  if (/google|googlequicksearchbox/.test(s)) return "google";
  if (/bing|msn/.test(s)) return "bing";
  if (!source && !host) return "direct";
  return "referral";
}

/** First touch of a visit: channel + the raw hints (no personal data, all clipped). */
export function attributionFromTouch({ referrer, url, ownHosts = [] }: TouchInput): Attribution {
  let params = new URLSearchParams();
  let landing: string | undefined;
  try {
    const u = new URL(url);
    params = u.searchParams;
    landing = clip(u.pathname, 120);
  } catch {
    /* keep defaults */
  }
  let host = hostOf(referrer);
  if (host && ownHosts.some((h) => is(host, h.replace(/^www\./, "")))) host = "";
  // Android's Google app sends an android-app:// referrer.
  if (!host && /^android-app:\/\//.test(referrer)) host = referrer.replace(/^android-app:\/\//, "").split("/")[0].toLowerCase();
  const source = (params.get("utm_source") ?? "").toLowerCase();
  const medium = (params.get("utm_medium") ?? "").toLowerCase();
  return {
    channel: classifyChannel(source, host, medium, params),
    referrer_domain: clip(host),
    utm_source: clip(params.get("utm_source")),
    utm_medium: clip(params.get("utm_medium")),
    utm_campaign: clip(params.get("utm_campaign")),
    landing,
  };
}

/** Validates attribution coming from the browser (order payload). Unknown channels → undefined. */
export function sanitizeAttribution(input: unknown): Attribution | undefined {
  if (!input || typeof input !== "object") return undefined;
  const a = input as Record<string, unknown>;
  if (typeof a.channel !== "string" || !(CHANNELS as readonly string[]).includes(a.channel)) return undefined;
  const str = (v: unknown, n = 80) => (typeof v === "string" ? clip(v, n) : undefined);
  const out: Attribution = { channel: a.channel as Channel };
  const referrer = str(a.referrer_domain);
  if (referrer && /^[a-z0-9.-]+$/i.test(referrer)) out.referrer_domain = referrer.toLowerCase();
  for (const k of ["utm_source", "utm_medium", "utm_campaign"] as const) {
    const v = str(a[k]);
    if (v && /^[\w .:/-]+$/.test(v)) out[k] = v;
  }
  const landing = str(a.landing, 120);
  if (landing && landing.startsWith("/") && !/[?#]/.test(landing)) out.landing = landing;
  return out;
}

/** Pseudonymous visitor id from the browser (UUID-like, only sent with statistics consent). */
export function sanitizeVisitorId(v: unknown): string | undefined {
  return typeof v === "string" && /^[a-f0-9-]{16,40}$/i.test(v) ? v.toLowerCase() : undefined;
}

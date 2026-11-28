/**
 * "Wie hast du uns gefunden?" – asked in the review mail and on the review page.
 * Pure (shared by client form, API route, mail template and admin).
 */

export const FOUND_VIA_OPTIONS = [
  { id: "google", label: "Google-Suche" },
  { id: "maps", label: "Google Maps" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "empfehlung", label: "Empfehlung" },
  { id: "stammkunde", label: "Schon einmal bestellt" },
  { id: "sonstiges", label: "Sonstiges" },
] as const;

export type FoundViaSource = (typeof FOUND_VIA_OPTIONS)[number]["id"];

export interface FoundVia {
  source: FoundViaSource;
  /** Free text for "Sonstiges" (max. 80 characters). */
  other?: string;
  at: string;
}

export function isFoundViaSource(v: unknown): v is FoundViaSource {
  return typeof v === "string" && FOUND_VIA_OPTIONS.some((o) => o.id === v);
}

export function foundViaLabel(f: Pick<FoundVia, "source" | "other">): string {
  const label = FOUND_VIA_OPTIONS.find((o) => o.id === f.source)?.label ?? f.source;
  return f.other ? `${label}: ${f.other}` : label;
}

/** Reads source + free text from a form or JSON body; null if no valid answer. */
export function readFoundVia(source: unknown, other: unknown, at = new Date().toISOString()): FoundVia | null {
  if (!isFoundViaSource(source)) return null;
  const text = typeof other === "string" ? other.replace(/[\r\n\t]+/g, " ").trim().slice(0, 80) : "";
  return { source, ...(source === "sonstiges" && text ? { other: text } : {}), at };
}

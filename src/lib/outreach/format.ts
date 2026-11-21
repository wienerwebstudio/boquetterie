import type {
  OutreachCategory, OutreachContact, OutreachLanguage, OutreachSalutation, OutreachSendStatus, OutreachStatus, OutreachTemplateCategory,
} from "@/types/outreach";

/**
 * Pure helpers for outreach mails: labels, the tiny body syntax and placeholders.
 * No server imports – used by the admin editor (live preview) and the mail renderer.
 */

export const STATUS_LABELS: Record<OutreachStatus, string> = {
  neu: "Neu",
  angeschrieben: "Angeschrieben",
  geantwortet: "Geantwortet",
  termin: "Termin",
  partner: "Partner/Kunde",
  "kein-interesse": "Kein Interesse",
};

/** Tailwind classes per status badge (admin). */
export const STATUS_TONES: Record<OutreachStatus, string> = {
  neu: "bg-[#e8eef7] text-[#2d4a7a]",
  angeschrieben: "bg-[#f8f0e4] text-[#9a5f28]",
  geantwortet: "bg-[#ece6f2] text-[#5a4778]",
  termin: "bg-[#f7e4e1] text-[#8f4553]",
  partner: "bg-[#e4ebe0] text-[#2f6b4f]",
  "kein-interesse": "bg-[#eee7dc] text-[#6b6862]",
};

export const CATEGORY_LABELS: Record<OutreachCategory, string> = {
  florist: "Florist",
  bestattung: "Bestattung",
  hotel: "Hotel",
  buero: "Büro/Firma",
  restaurant: "Restaurant/Café",
  sonstiges: "Sonstiges",
};

export const TEMPLATE_CATEGORY_LABELS: Record<OutreachTemplateCategory, string> = {
  ...CATEGORY_LABELS,
  allgemein: "Allgemein",
  nachfassen: "Nachfassen",
};

export const SALUTATION_LABELS: Record<OutreachSalutation, string> = { frau: "Frau", herr: "Herr", "": "–" };

export const SEND_STATUS_LABELS: Record<OutreachSendStatus, string> = {
  queued: "geplant", sending: "wird gesendet", sent: "gesendet", failed: "fehlgeschlagen", skipped: "übersprungen", cancelled: "abgebrochen",
};

export const PLACEHOLDERS = ["Anrede", "Vorname", "Nachname", "Firma", "Bezirk"] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

export type ContactLike = Pick<OutreachContact, "salutation" | "firstName" | "lastName" | "company" | "district">;

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/**
 * Opening line from the contact's salutation.
 * de: "Sehr geehrte Frau Huber," / "Sehr geehrter Herr Huber," / "Guten Tag,"
 * en: "Dear Ms Huber," / "Dear Mr Huber," / "Hello,"
 * Without a last name (or salutation) the neutral greeting is used.
 */
export function salutationLine(contact: Pick<ContactLike, "salutation" | "lastName">, lang: OutreachLanguage = "de"): string {
  const last = contact.lastName.trim();
  if (last && contact.salutation === "frau") return lang === "en" ? `Dear Ms ${last},` : `Sehr geehrte Frau ${last},`;
  if (last && contact.salutation === "herr") return lang === "en" ? `Dear Mr ${last},` : `Sehr geehrter Herr ${last},`;
  return lang === "en" ? "Hello," : "Guten Tag,";
}

export function placeholderValues(contact: ContactLike, lang: OutreachLanguage = "de"): Record<Placeholder, string> {
  return {
    Anrede: salutationLine(contact, lang),
    Vorname: contact.firstName.trim(),
    Nachname: contact.lastName.trim(),
    Firma: contact.company.trim(),
    Bezirk: contact.district.trim(),
  };
}

const PLACEHOLDER_RE = /\{(Anrede|Vorname|Nachname|Firma|Bezirk)\}/g;

/** Replaces the placeholders in plain text (subject, text version). */
export function fillPlaceholders(text: string, values: Record<Placeholder, string>): string {
  return text.replace(PLACEHOLDER_RE, (_, name: Placeholder) => values[name]);
}

/** Placeholders used in `texts` for which the contact has no value (shown as a warning). */
export function missingPlaceholders(texts: string[], values: Record<Placeholder, string>): Placeholder[] {
  const used = new Set<Placeholder>();
  for (const t of texts) for (const m of t.matchAll(PLACEHOLDER_RE)) used.add(m[1] as Placeholder);
  return [...used].filter((p) => !values[p]);
}

/** Only these link targets are rendered as links; everything else stays text. */
export function isSafeUrl(url: string): boolean {
  return /^(https?:\/\/[^\s<>"']+|mailto:[^\s<>"']+|tel:[+\d\s/()-]+)$/i.test(url.trim());
}

export interface InlineOptions {
  /** Placeholder values; already plain text – they are escaped, never parsed as markup. */
  values?: Record<Placeholder, string>;
  /** Maps a link target to the URL written into the mail (click tracking). */
  link?: (url: string) => string;
  linkStyle?: string;
  boldStyle?: string;
}

const INLINE_RE = /\*\*([^*]+?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/** Escapes text and substitutes placeholders (after escaping, so values cannot inject markup). */
function textHtml(raw: string, opts: InlineOptions): string {
  const escaped = escapeHtml(raw);
  if (!opts.values) return escaped;
  const values = opts.values;
  return escaped.replace(PLACEHOLDER_RE, (_, name: Placeholder) => escapeHtml(values[name]));
}

/** **bold** and [label](url) to HTML; everything else is escaped. */
export function inlineHtml(raw: string, opts: InlineOptions = {}): string {
  let out = "";
  let last = 0;
  for (const m of raw.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    out += textHtml(raw.slice(last, idx), opts);
    if (m[1] !== undefined) {
      out += `<strong${opts.boldStyle ? ` style="${opts.boldStyle}"` : ""}>${inlineHtml(m[1], opts)}</strong>`;
    } else {
      const label = m[2];
      const url = m[3];
      if (isSafeUrl(url)) {
        const href = opts.link && /^https?:/i.test(url) ? opts.link(url) : url;
        out += `<a href="${escapeHtml(href)}"${opts.linkStyle ? ` style="${opts.linkStyle}"` : ""}>${textHtml(label, opts)}</a>`;
      } else {
        out += textHtml(m[0], opts);
      }
    }
    last = idx + m[0].length;
  }
  return out + textHtml(raw.slice(last), opts);
}

/** Plain-text version of one line: bold markers dropped, links as "label (url)". */
export function inlineText(raw: string, values?: Record<Placeholder, string>): string {
  const t = raw.replace(INLINE_RE, (all, bold: string | undefined, label: string | undefined, url: string | undefined) => {
    if (bold !== undefined) return bold;
    return url && isSafeUrl(url) ? `${label} (${url})` : all;
  });
  return values ? fillPlaceholders(t, values) : t;
}

export type BodyBlock = { type: "p"; lines: string[] } | { type: "ul"; items: string[] };

/** Blank line = new paragraph; a block whose lines all start with "- " is a bullet list. */
export function parseBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  for (const chunk of body.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim() !== "");
    if (!lines.length) continue;
    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
      blocks.push({ type: "ul", items: lines.map((l) => l.replace(/^\s*[-•]\s+/, "")) });
    } else {
      // Mixed: paragraph lines first, then a list (e.g. "Wir bieten:\n- a\n- b").
      const firstItem = lines.findIndex((l) => /^\s*[-•]\s+/.test(l));
      if (firstItem > 0 && lines.slice(firstItem).every((l) => /^\s*[-•]\s+/.test(l))) {
        blocks.push({ type: "p", lines: lines.slice(0, firstItem) });
        blocks.push({ type: "ul", items: lines.slice(firstItem).map((l) => l.replace(/^\s*[-•]\s+/, "")) });
      } else {
        blocks.push({ type: "p", lines });
      }
    }
  }
  return blocks;
}

export interface BodyStyles {
  p: string;
  ul: string;
  li: string;
  link: string;
  bold: string;
}

const PLAIN_STYLES: BodyStyles = { p: "", ul: "", li: "", link: "", bold: "" };
const attr = (style: string) => (style ? ` style="${style}"` : "");

/** Body syntax → safe HTML (all user text escaped). */
export function bodyToHtml(body: string, opts: Omit<InlineOptions, "linkStyle" | "boldStyle"> & { styles?: BodyStyles } = {}): string {
  const s = opts.styles ?? PLAIN_STYLES;
  const inline = (t: string) => inlineHtml(t, { ...opts, linkStyle: s.link, boldStyle: s.bold });
  return parseBody(body)
    .map((b) =>
      b.type === "p"
        ? `<p${attr(s.p)}>${b.lines.map(inline).join("<br>")}</p>`
        : `<ul${attr(s.ul)}>${b.items.map((i) => `<li${attr(s.li)}>${inline(i)}</li>`).join("")}</ul>`,
    )
    .join("\n");
}

export function bodyToText(body: string, values?: Record<Placeholder, string>): string {
  return parseBody(body)
    .map((b) => (b.type === "p" ? b.lines.map((l) => inlineText(l, values)).join("\n") : b.items.map((i) => `• ${inlineText(i, values)}`).join("\n")))
    .join("\n\n");
}

/** All http(s) link targets in a body, in order of appearance (unique). */
export function bodyLinks(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(INLINE_RE)) {
    const url = m[3];
    if (url && /^https?:/i.test(url) && isSafeUrl(url) && !out.includes(url)) out.push(url);
  }
  return out;
}

export function contactName(c: Pick<OutreachContact, "firstName" | "lastName">) {
  return [c.firstName, c.lastName].map((s) => s.trim()).filter(Boolean).join(" ");
}

/** Display name in lists: company, else the person, else the address. */
export function contactLabel(c: Pick<OutreachContact, "company" | "firstName" | "lastName" | "email">) {
  return c.company.trim() || contactName(c) || c.email;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
export const isValidEmail = (email: string) => email.length <= 200 && EMAIL_RE.test(email.trim());

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

import type { OutreachContact, OutreachSend } from "@/types/outreach";
import { CATEGORY_LABELS, normalizeEmail, SALUTATION_LABELS, STATUS_LABELS } from "./format";

/** Quotes when needed; a leading "=" or "@" is defused so Excel does not run it as a formula. */
const cell = (raw: string) => {
  const v = /^[=@]/.test(raw) ? `'${raw}` : raw;
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");

/** Contacts with status for Excel (semicolon, UTF-8 BOM, CRLF) – same format as the florist budget export. */
export function outreachContactsCsv(contacts: OutreachContact[], sends: OutreachSend[], unsubscribed: Set<string>): string {
  const rows: string[][] = [[
    "Firma", "Anrede", "Vorname", "Nachname", "E-Mail", "Telefon", "Bezirk", "Kategorie", "Website", "Status",
    "Abgemeldet", "Tags", "Notiz", "Letzte Mail", "Mails gesendet", "Geöffnet", "Geklickt", "Angelegt",
  ]];
  for (const c of contacts) {
    const mine = sends.filter((s) => s.contactId === c.id && s.status === "sent");
    rows.push([
      c.company, c.salutation ? SALUTATION_LABELS[c.salutation] : "", c.firstName, c.lastName, c.email, c.phone, c.district,
      CATEGORY_LABELS[c.category] ?? c.category, c.website, STATUS_LABELS[c.status] ?? c.status,
      unsubscribed.has(normalizeEmail(c.email)) ? "ja" : "nein", c.tags.join(", "), c.notes, day(c.lastMailedAt),
      String(mine.length), mine.some((s) => s.opens > 0) ? "ja" : "nein", mine.some((s) => s.clicks.length > 0) ? "ja" : "nein", day(c.createdAt),
    ]);
  }
  return "﻿" + rows.map((r) => r.map((v) => cell(v ?? "")).join(";")).join("\r\n") + "\r\n";
}

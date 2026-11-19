import type { OutreachCategory, OutreachContact, OutreachSend, OutreachStatus } from "@/types/outreach";
import { contactLabel, contactName, normalizeEmail } from "./format";

/** Lean contact row for the admin list and the send composer (client components). */
export interface ContactRow {
  id: string;
  label: string;
  name: string;
  company: string;
  email: string;
  category: OutreachCategory;
  status: OutreachStatus;
  district: string;
  tags: string[];
  lastMailedAt?: string;
  unsubscribed: boolean;
  sent: number;
  opened: boolean;
  clicked: boolean;
  queued: number;
}

export function contactRows(contacts: OutreachContact[], sends: OutreachSend[], unsubscribed: Set<string>): ContactRow[] {
  const byContact = new Map<string, OutreachSend[]>();
  for (const s of sends) {
    const list = byContact.get(s.contactId) ?? [];
    list.push(s);
    byContact.set(s.contactId, list);
  }
  return contacts
    .map((c) => {
      const mine = byContact.get(c.id) ?? [];
      const sent = mine.filter((s) => s.status === "sent");
      return {
        id: c.id,
        label: contactLabel(c),
        name: contactName(c),
        company: c.company,
        email: c.email,
        category: c.category,
        status: c.status,
        district: c.district,
        tags: c.tags,
        lastMailedAt: c.lastMailedAt,
        unsubscribed: unsubscribed.has(normalizeEmail(c.email)),
        sent: sent.length,
        opened: sent.some((s) => s.opens > 0),
        clicked: sent.some((s) => s.clicks.length > 0),
        queued: mine.filter((s) => s.status === "queued").length,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "de"));
}

export interface RowFilter {
  status: string;
  category: string;
  district: string;
  q: string;
}

export const EMPTY_FILTER: RowFilter = { status: "", category: "", district: "", q: "" };

export function filterRows(rows: ContactRow[], f: RowFilter): ContactRow[] {
  const q = f.q.trim().toLowerCase();
  const d = f.district.trim().toLowerCase();
  return rows.filter((r) =>
    (!f.status || r.status === f.status) &&
    (!f.category || r.category === f.category) &&
    (!d || r.district.toLowerCase().includes(d)) &&
    (!q || [r.label, r.name, r.company, r.email, r.district, ...r.tags].some((v) => v.toLowerCase().includes(q))),
  );
}

import type { OutreachCategory, OutreachContact, OutreachSalutation } from "@/types/outreach";
import { isValidEmail, normalizeEmail } from "./format";

/**
 * CSV/TSV import for outreach contacts (pure).
 * Accepts a file or text pasted from Excel: the delimiter (tab, semicolon, comma) is
 * detected from the header line, quoted fields ("…", with "" escapes and line breaks)
 * are supported, columns are mapped by header name.
 */

export type ImportField =
  | "company" | "salutation" | "firstName" | "lastName" | "name" | "email" | "phone"
  | "district" | "category" | "website" | "notes" | "tags";

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  company: "Firma",
  salutation: "Anrede",
  firstName: "Vorname",
  lastName: "Nachname",
  name: "Name (Vor- und Nachname)",
  email: "E-Mail",
  phone: "Telefon",
  district: "Bezirk/PLZ",
  category: "Kategorie",
  website: "Website",
  notes: "Notiz",
  tags: "Tags",
};

/** Header aliases (lower case, without spaces, dots, dashes, underscores). */
const ALIASES: Record<ImportField, string[]> = {
  company: ["firma", "company", "unternehmen", "firmenname", "betrieb", "geschäft", "geschaeft", "organisation", "organization", "business", "companyname"],
  salutation: ["anrede", "salutation", "title", "titel", "geschlecht", "gender"],
  firstName: ["vorname", "firstname", "first", "givenname"],
  lastName: ["nachname", "lastname", "last", "surname", "familienname", "familyname"],
  name: ["name", "kontakt", "ansprechpartner", "ansprechperson", "contact", "contactname", "fullname"],
  email: ["email", "mail", "emailadresse", "emailaddress", "e-mail", "mailadresse"],
  phone: ["telefon", "phone", "tel", "telefonnummer", "phonenumber", "mobil", "mobile", "handy"],
  district: ["bezirk", "plz", "bezirkplz", "plzbezirk", "plzort", "bezirkort", "postleitzahl", "district", "zip", "zipcode", "postcode", "postalcode", "ort"],
  category: ["kategorie", "category", "branche", "typ", "type", "art"],
  website: ["website", "webseite", "homepage", "url", "web", "internet", "www"],
  notes: ["notiz", "notizen", "note", "notes", "bemerkung", "bemerkungen", "kommentar", "comment", "info"],
  tags: ["tags", "tag", "schlagworte", "labels"],
};

const norm = (h: string) => h.trim().toLowerCase().replace(/^﻿/, "").replace(/[\s._\-/()]+/g, "");

export function mapHeader(header: string): ImportField | null {
  const h = norm(header);
  if (!h) return null;
  for (const [field, aliases] of Object.entries(ALIASES) as [ImportField, string[]][]) {
    if (aliases.some((a) => norm(a) === h)) return field;
  }
  // "Firma/Company", "E-Mail | Mail": the first part that is known.
  const parts = header.split(/[/|]/);
  if (parts.length > 1) {
    for (const p of parts) {
      const f = mapHeader(p);
      if (f) return f;
    }
  }
  return null;
}

/** Column → field for a header row; later duplicates of a field are ignored. */
export function mapColumns(headers: string[]): (ImportField | null)[] {
  const used = new Set<ImportField>();
  return headers.map((h) => {
    const f = mapHeader(h);
    if (!f || used.has(f)) return null;
    used.add(f);
    return f;
  });
}

export function detectDelimiter(firstLine: string): "\t" | ";" | "," {
  const count = (c: string) => firstLine.split(c).length - 1;
  const tabs = count("\t");
  const semis = count(";");
  const commas = count(",");
  if (tabs > 0 && tabs >= semis && tabs >= commas) return "\t";
  if (semis > 0 && semis >= commas) return ";";
  return commas > 0 ? "," : "\t";
}

/** Splits CSV/TSV text into rows (RFC 4180 quoting). Empty lines are dropped. */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const d = delimiter ?? detectDelimiter(src.split("\n", 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === "") quoted = true;
    else if (c === d) { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export function parseSalutation(raw: string): OutreachSalutation {
  const v = raw.trim().toLowerCase().replace(/\.$/, "");
  if (["frau", "fr", "ms", "mrs", "miss", "f", "w", "weiblich", "female"].includes(v)) return "frau";
  if (["herr", "hr", "mr", "m", "männlich", "maennlich", "male"].includes(v)) return "herr";
  return "";
}

export function parseCategory(raw: string): OutreachCategory {
  const v = raw.trim().toLowerCase();
  if (!v) return "sonstiges";
  if (/flor|blum|gärtn|gaertn/.test(v)) return "florist";
  if (/bestatt|funeral|trauer|friedhof/.test(v)) return "bestattung";
  if (/hotel|pension|hostel|apartment/.test(v)) return "hotel";
  if (/büro|buero|firma|office|unternehmen|kanzlei|agentur|praxis|company|corporate/.test(v)) return "buero";
  if (/restaurant|café|cafe|kaffee|bar|gastro|bistro|heuriger|beisl/.test(v)) return "restaurant";
  return "sonstiges";
}

export interface ImportDraft {
  company: string;
  salutation: OutreachSalutation;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  district: string;
  category: OutreachCategory;
  website: string;
  notes: string;
  tags: string[];
}

export type ImportRowState = "new" | "duplicate" | "duplicate-in-file" | "invalid" | "unsubscribed";

export interface ImportRow {
  line: number; // 1-based line in the data (header = line 1)
  draft: ImportDraft;
  state: ImportRowState;
  problem?: string;
  /** Existing contact with the same address (state "duplicate"). */
  existingId?: string;
}

export interface ImportPreview {
  columns: (ImportField | null)[];
  headers: string[];
  rows: ImportRow[];
  counts: Record<ImportRowState, number>;
}

function rowToDraft(cells: string[], columns: (ImportField | null)[], defaultCategory?: OutreachCategory): ImportDraft {
  const get = (f: ImportField) => {
    const i = columns.indexOf(f);
    return i >= 0 ? (cells[i] ?? "").trim() : "";
  };
  let firstName = get("firstName");
  let lastName = get("lastName");
  const full = get("name");
  if (full && !firstName && !lastName) {
    const parts = full.split(/\s+/);
    lastName = parts.pop() ?? "";
    firstName = parts.join(" ");
  }
  const categoryRaw = get("category");
  return {
    company: get("company").slice(0, 200),
    salutation: parseSalutation(get("salutation")),
    firstName: firstName.slice(0, 100),
    lastName: lastName.slice(0, 100),
    email: normalizeEmail(get("email").replace(/^mailto:/i, "")),
    phone: get("phone").slice(0, 60),
    district: get("district").slice(0, 80),
    category: categoryRaw ? parseCategory(categoryRaw) : (defaultCategory ?? "sonstiges"),
    website: get("website").slice(0, 300),
    notes: get("notes").slice(0, 2000),
    tags: get("tags").split(/[,;|]/).map((s) => s.trim()).filter(Boolean).slice(0, 20),
  };
}

/**
 * Parses pasted/uploaded text and classifies every row against the existing
 * contacts and the unsubscribe list. Nothing is saved here.
 */
export function previewImport(
  text: string,
  existing: Pick<OutreachContact, "id" | "email">[],
  unsubscribed: string[],
  defaultCategory?: OutreachCategory,
): ImportPreview {
  const all = parseDelimited(text);
  const headers = all[0] ?? [];
  const columns = mapColumns(headers);
  const byEmail = new Map(existing.map((c) => [normalizeEmail(c.email), c.id]));
  const blocked = new Set(unsubscribed.map(normalizeEmail));
  const seen = new Set<string>();
  const counts: Record<ImportRowState, number> = { new: 0, duplicate: 0, "duplicate-in-file": 0, invalid: 0, unsubscribed: 0 };
  const rows: ImportRow[] = all.slice(1).map((cells, i) => {
    const draft = rowToDraft(cells, columns, defaultCategory);
    let state: ImportRowState = "new";
    let problem: string | undefined;
    let existingId: string | undefined;
    if (!columns.includes("email")) { state = "invalid"; problem = "Keine Spalte „E-Mail“ erkannt."; }
    else if (!draft.email) { state = "invalid"; problem = "E-Mail fehlt."; }
    else if (!isValidEmail(draft.email)) { state = "invalid"; problem = "E-Mail ungültig."; }
    else if (blocked.has(draft.email)) { state = "unsubscribed"; problem = "Hat sich abgemeldet – wird nicht importiert."; }
    else if (seen.has(draft.email)) { state = "duplicate-in-file"; problem = "Doppelt in der Datei."; }
    else if (byEmail.has(draft.email)) { state = "duplicate"; existingId = byEmail.get(draft.email); }
    if (draft.email) seen.add(draft.email);
    counts[state]++;
    return { line: i + 2, draft, state, problem, existingId };
  });
  return { columns, headers, rows, counts };
}

/**
 * Applies an import: new rows become contacts; duplicates are skipped or update the
 * existing contact (only non-empty imported fields overwrite, status/history kept).
 */
export function applyImport(
  contacts: OutreachContact[],
  rows: ImportRow[],
  mode: "skip" | "update",
  now: string,
  newId: () => string,
): { contacts: OutreachContact[]; added: number; updated: number; skipped: number } {
  const next = contacts.slice();
  const index = new Map(next.map((c, i) => [normalizeEmail(c.email), i]));
  let added = 0, updated = 0, skipped = 0;
  for (const row of rows) {
    const d = row.draft;
    if (row.state === "invalid" || row.state === "unsubscribed" || row.state === "duplicate-in-file") { skipped++; continue; }
    const at = index.get(d.email);
    if (at !== undefined) {
      if (mode === "skip") { skipped++; continue; }
      const c = next[at];
      const pick = (v: string, old: string) => (v.trim() ? v : old);
      next[at] = {
        ...c,
        company: pick(d.company, c.company),
        salutation: d.salutation || c.salutation,
        firstName: pick(d.firstName, c.firstName),
        lastName: pick(d.lastName, c.lastName),
        phone: pick(d.phone, c.phone),
        district: pick(d.district, c.district),
        category: d.category !== "sonstiges" ? d.category : c.category,
        website: pick(d.website, c.website),
        notes: pick(d.notes, c.notes),
        tags: [...new Set([...c.tags, ...d.tags])],
        updatedAt: now,
        history: [...c.history, { at: now, type: "updated", text: "Per Import aktualisiert" }],
      };
      updated++;
      continue;
    }
    const contact: OutreachContact = {
      id: newId(),
      ...d,
      status: "neu",
      noteEntries: [],
      history: [{ at: now, type: "imported", text: "Importiert" }],
      createdAt: now,
      updatedAt: now,
    };
    index.set(d.email, next.length);
    next.push(contact);
    added++;
  }
  return { contacts: next, added, updated, skipped };
}

import { describe, expect, it } from "vitest";
import { applyImport, detectDelimiter, mapColumns, mapHeader, parseCategory, parseDelimited, parseSalutation, previewImport } from "@/lib/outreach/import";
import { outreachContactsCsv } from "@/lib/outreach/csv";
import type { OutreachContact } from "@/types/outreach";

const contact = (over: Partial<OutreachContact> = {}): OutreachContact => ({
  id: "c1", company: "Alt GmbH", salutation: "", firstName: "", lastName: "", email: "alt@firma.at", phone: "", district: "1010",
  category: "buero", website: "", notes: "", status: "angeschrieben", tags: ["a"], noteEntries: [], history: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z",
  ...over,
});

describe("parsing", () => {
  it("detects tab, semicolon and comma", () => {
    expect(detectDelimiter("Firma\tE-Mail")).toBe("\t");
    expect(detectDelimiter("Firma;E-Mail")).toBe(";");
    expect(detectDelimiter("Firma,E-Mail")).toBe(",");
  });
  it("handles quotes, escaped quotes, line breaks in cells, CRLF and BOM", () => {
    const rows = parseDelimited('﻿Firma;Notiz\r\n"Blumen ""Rosa"" KG";"Zeile 1\nZeile 2"\r\n\r\nB;x');
    expect(rows).toEqual([["Firma", "Notiz"], ['Blumen "Rosa" KG', "Zeile 1\nZeile 2"], ["B", "x"]]);
  });
  it("maps headers in German and English", () => {
    expect(mapHeader("E-Mail")).toBe("email");
    expect(mapHeader("Email Address")).toBe("email");
    expect(mapHeader("Company")).toBe("company");
    expect(mapHeader("PLZ")).toBe("district");
    expect(mapHeader("Salutation")).toBe("salutation");
    expect(mapHeader("Notiz")).toBe("notes");
    expect(mapHeader("Irgendwas")).toBeNull();
    expect(mapColumns(["E-Mail", "Mail", "Firma"])).toEqual(["email", null, "company"]);
  });
  it("normalises salutations and categories", () => {
    expect(parseSalutation("Fr.")).toBe("frau");
    expect(parseSalutation("Mr")).toBe("herr");
    expect(parseSalutation("Divers")).toBe("");
    expect(parseCategory("Bestattung Wien")).toBe("bestattung");
    expect(parseCategory("Café")).toBe("restaurant");
    expect(parseCategory("Blumenhandel")).toBe("florist");
    expect(parseCategory("Steuerkanzlei")).toBe("buero");
    expect(parseCategory("Verein")).toBe("sonstiges");
  });
});

describe("preview & apply", () => {
  const text = [
    "Firma\tAnrede\tVorname\tNachname\tE-Mail\tBezirk/PLZ\tKategorie",
    "Neu KG\tFrau\tAnna\tHuber\tAnna@Neu.at\t1070\tHotel",
    "Alt GmbH 2\tHerr\tMax\tMuster\talt@firma.at\t\t",
    "Doppelt\t\t\t\tanna@neu.at\t\t",
    "Kaputt\t\t\t\tkeine-mail\t\t",
    "Weg\t\t\t\tweg@x.at\t\t",
  ].join("\n");

  it("classifies new, duplicate, duplicate in file, invalid and unsubscribed", () => {
    const p = previewImport(text, [contact()], ["WEG@x.at"], "florist");
    expect(p.rows.map((r) => r.state)).toEqual(["new", "duplicate", "duplicate-in-file", "invalid", "unsubscribed"]);
    expect(p.rows[0].draft).toMatchObject({ email: "anna@neu.at", salutation: "frau", category: "hotel", district: "1070" });
    expect(p.rows[1].draft.category).toBe("florist");
    expect(p.rows[1].existingId).toBe("c1");
    expect(p.counts).toEqual({ new: 1, duplicate: 1, "duplicate-in-file": 1, invalid: 1, unsubscribed: 1 });
  });

  it("rejects everything without an e-mail column", () => {
    const p = previewImport("Firma\nA", [], []);
    expect(p.rows[0].state).toBe("invalid");
  });

  it("splits a single name column", () => {
    const p = previewImport("Name;E-Mail\nAnna Maria Huber;a@b.at", [], []);
    expect(p.rows[0].draft).toMatchObject({ firstName: "Anna Maria", lastName: "Huber" });
  });

  it("skips or updates duplicates and never touches status/history on update", () => {
    const p = previewImport(text, [contact()], ["weg@x.at"]);
    let n = 0;
    const skip = applyImport([contact()], p.rows, "skip", "2026-11-19T10:00:00Z", () => `new${++n}`);
    expect(skip).toMatchObject({ added: 1, updated: 0, skipped: 4 });
    expect(skip.contacts[1]).toMatchObject({ id: "new1", status: "neu", email: "anna@neu.at" });
    expect(skip.contacts[0].company).toBe("Alt GmbH");

    const upd = applyImport([contact()], p.rows, "update", "2026-11-19T10:00:00Z", () => "x");
    expect(upd).toMatchObject({ added: 1, updated: 1, skipped: 3 });
    expect(upd.contacts[0]).toMatchObject({ company: "Alt GmbH 2", firstName: "Max", salutation: "herr", district: "1010", status: "angeschrieben", category: "buero" });
    expect(upd.contacts[0].history.at(-1)?.text).toContain("Import");
  });
});

describe("csv export", () => {
  it("writes BOM, semicolons, quoting and defuses formulas", () => {
    const csv = outreachContactsCsv([contact({ company: "=HYPERLINK(1)", notes: 'a;"b"' })], [], new Set(["alt@firma.at"]));
    expect(csv.startsWith("﻿Firma;Anrede;")).toBe(true);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain('"a;""b"""');
    expect(csv).toContain(";Angeschrieben;ja;");
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

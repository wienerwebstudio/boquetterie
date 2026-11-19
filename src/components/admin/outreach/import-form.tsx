"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { applyOutreachImportAction, previewOutreachImportAction } from "@/app/admin/outreach/actions";
import { Banner, Field, inputCls, Table, Td, Th } from "@/components/admin/controls";
import { CATEGORY_LABELS, SALUTATION_LABELS } from "@/lib/outreach/format";
import { IMPORT_FIELD_LABELS, type ImportPreview, type ImportRowState } from "@/lib/outreach/import";
import { OUTREACH_CATEGORIES } from "@/types/outreach";
import { cn } from "@/lib/format";
import { btnOutline, btnPrimary } from "./bits";

const STATE: Record<ImportRowState, { label: string; cls: string }> = {
  new: { label: "neu", cls: "bg-[#e4ebe0] text-[#2f6b4f]" },
  duplicate: { label: "schon vorhanden", cls: "bg-[#f8f0e4] text-[#9a5f28]" },
  "duplicate-in-file": { label: "doppelt in Datei", cls: "bg-ivory-200 text-ink-muted" },
  invalid: { label: "ungültig", cls: "bg-[#f8ecec] text-danger" },
  unsubscribed: { label: "abgemeldet", cls: "bg-ivory-200 text-ink-muted" },
};

export function ImportForm() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("");
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const runPreview = (value = text) => {
    setMsg(null);
    start(async () => {
      const r = await previewOutreachImportAction(value, defaultCategory || undefined);
      if (r.ok) setPreview(r.preview);
      else { setPreview(null); setMsg({ ok: false, text: r.message }); }
    });
  };

  const readFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    // Excel's "CSV (Trennzeichen-getrennt)" is Windows-1252; UTF-8 first, then fall back.
    let value = new TextDecoder("utf-8").decode(buf);
    if (value.includes("�")) value = new TextDecoder("windows-1252").decode(buf);
    setText(value);
    setFileName(file.name);
    runPreview(value);
  };

  const importable = preview ? preview.counts.new + (mode === "update" ? preview.counts.duplicate : 0) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Datei (CSV oder TSV)" htmlFor="imp-file" hint="Aus Excel: Datei → Speichern unter → „CSV UTF-8“. Spalten werden an den Überschriften erkannt.">
          <input id="imp-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); }} className="text-[14px]" />
        </Field>
        <Field label="Standard-Kategorie" htmlFor="imp-cat" hint="Für Zeilen ohne Spalte „Kategorie“.">
          <select id="imp-cat" value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)} className={inputCls}>
            <option value="">Sonstiges</option>
            {OUTREACH_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </Field>
      </div>
      <Field label="… oder Tabelle einfügen" htmlFor="imp-text" hint="In Excel die Zeilen samt Überschrift markieren, kopieren (Strg+C) und hier einfügen (Strg+V). Erkannte Überschriften: Firma/Company, Anrede/Salutation, Vorname, Nachname, E-Mail, Telefon, Bezirk/PLZ, Kategorie, Website, Notiz, Tags.">
        <textarea id="imp-text" rows={8} value={text} onChange={(e) => { setText(e.target.value); setFileName(""); }} placeholder={"Firma\tAnrede\tVorname\tNachname\tE-Mail\tBezirk\nBlumen Beispiel\tFrau\tAnna\tHuber\tanna@beispiel.at\t1070"} className={`${inputCls} h-auto py-2 font-mono text-[13px]`} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending || !text.trim()} onClick={() => runPreview()} className={btnOutline}>{pending ? "Wird gelesen …" : "Vorschau"}</button>
        {fileName && <span className="text-[13px] text-ink-muted">{fileName}</span>}
      </div>
      {msg && <Banner tone={msg.ok ? "success" : "error"}>{msg.text}{msg.ok && <> <Link href="/admin/outreach" className="font-semibold underline">Zu den Kontakten</Link></>}</Banner>}

      {preview && (
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-4 text-[14px]">
            <p className="font-semibold text-ink">Erkannte Spalten</p>
            <p className="mt-1 flex flex-wrap gap-1.5">
              {preview.headers.map((h, i) => (
                <span key={`${h}-${i}`} className={cn("rounded-sm px-2 py-0.5 text-[12px]", preview.columns[i] ? "bg-[#e4ebe0] text-[#2f6b4f]" : "bg-ivory-200 text-ink-muted line-through")}>
                  {h || "(leer)"}{preview.columns[i] ? ` → ${IMPORT_FIELD_LABELS[preview.columns[i]!]}` : ""}
                </span>
              ))}
            </p>
            <p className="mt-3 text-ink-muted">
              {preview.counts.new} neu · {preview.counts.duplicate} schon vorhanden · {preview.counts["duplicate-in-file"]} doppelt in der Datei · {preview.counts.unsubscribed} abgemeldet · {preview.counts.invalid} ungültig
            </p>
          </div>
          {preview.counts.duplicate > 0 && (
            <fieldset className="flex flex-wrap gap-4 text-[14px]">
              <legend className="mb-1 text-[13px] font-semibold text-ink">Vorhandene E-Mail-Adressen</legend>
              <label className="inline-flex items-center gap-2"><input type="radio" name="dup" checked={mode === "skip"} onChange={() => setMode("skip")} className="accent-forest" /> überspringen</label>
              <label className="inline-flex items-center gap-2"><input type="radio" name="dup" checked={mode === "update"} onChange={() => setMode("update")} className="accent-forest" /> aktualisieren (leere Felder bleiben, Status und Verlauf bleiben)</label>
            </fieldset>
          )}
          <Table>
            <thead><tr><Th>Zeile</Th><Th>Ergebnis</Th><Th>Firma</Th><Th>Name</Th><Th>E-Mail</Th><Th>Bezirk</Th><Th>Kategorie</Th></tr></thead>
            <tbody>
              {preview.rows.slice(0, 300).map((r) => (
                <tr key={r.line} className={r.state === "new" || r.state === "duplicate" ? undefined : "opacity-60"}>
                  <Td className="text-ink-muted">{r.line}</Td>
                  <Td>
                    <span className={cn("rounded-sm px-2 py-0.5 text-[12px] font-semibold", STATE[r.state].cls)}>{STATE[r.state].label}</span>
                    {r.problem && <p className="mt-1 text-[12px] text-ink-muted">{r.problem}</p>}
                  </Td>
                  <Td>{r.draft.company || "–"}</Td>
                  <Td className="whitespace-nowrap">{[r.draft.salutation ? SALUTATION_LABELS[r.draft.salutation] : "", r.draft.firstName, r.draft.lastName].filter(Boolean).join(" ") || "–"}</Td>
                  <Td className="break-all">{r.draft.email || "–"}</Td>
                  <Td>{r.draft.district || "–"}</Td>
                  <Td className="whitespace-nowrap">{CATEGORY_LABELS[r.draft.category]}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {preview.rows.length > 300 && <p className="text-[13px] text-ink-muted">… und {preview.rows.length - 300} weitere Zeilen.</p>}
          <button
            type="button"
            disabled={pending || importable === 0}
            className={btnPrimary}
            onClick={() => start(async () => {
              const r = await applyOutreachImportAction(text, mode, defaultCategory || undefined);
              setMsg({ ok: r.ok, text: r.message });
              if (r.ok) { setPreview(null); setText(""); setFileName(""); }
            })}
          >
            {importable} Kontakt{importable === 1 ? "" : "e"} {mode === "update" && preview.counts.duplicate ? "importieren/aktualisieren" : "importieren"}
          </button>
        </div>
      )}
    </div>
  );
}

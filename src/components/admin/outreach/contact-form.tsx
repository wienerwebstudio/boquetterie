"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveOutreachContactAction } from "@/app/admin/outreach/actions";
import { Banner, Field, inputCls } from "@/components/admin/controls";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/outreach/format";
import { OUTREACH_CATEGORIES, OUTREACH_STATUSES, type OutreachContact } from "@/types/outreach";
import { btnPrimary } from "./bits";

type Values = Pick<OutreachContact, "company" | "salutation" | "firstName" | "lastName" | "email" | "phone" | "district" | "category" | "website" | "notes" | "status"> & { tags: string; language: "de" | "en" };

const EMPTY: Values = { company: "", salutation: "", firstName: "", lastName: "", email: "", phone: "", district: "", category: "florist", website: "", notes: "", status: "neu", tags: "", language: "de" };

export function ContactForm({ contact }: { contact?: OutreachContact }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(() => (contact ? { ...EMPTY, ...contact, tags: contact.tags.join(", "), language: contact.language ?? "de" } : EMPTY));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Values>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await saveOutreachContactAction(contact?.id ?? null, v);
          setMsg({ ok: r.ok, text: r.message });
          if (r.ok && !contact && r.id) router.push(`/admin/outreach/kontakte/${r.id}`);
          else if (r.ok) router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Firma" htmlFor="c-company" className="sm:col-span-2"><input id="c-company" value={v.company} onChange={set("company")} className={inputCls} /></Field>
        <Field label="Anrede" htmlFor="c-sal">
          <select id="c-sal" value={v.salutation} onChange={set("salutation")} className={inputCls}>
            <option value="">– (Guten Tag)</option>
            <option value="frau">Frau</option>
            <option value="herr">Herr</option>
          </select>
        </Field>
        <Field label="Sprache der Mails" htmlFor="c-lang">
          <select id="c-lang" value={v.language} onChange={set("language")} className={inputCls}>
            <option value="de">Deutsch</option>
            <option value="en">Englisch</option>
          </select>
        </Field>
        <Field label="Vorname" htmlFor="c-first"><input id="c-first" value={v.firstName} onChange={set("firstName")} className={inputCls} /></Field>
        <Field label="Nachname" htmlFor="c-last"><input id="c-last" value={v.lastName} onChange={set("lastName")} className={inputCls} /></Field>
        <Field label="E-Mail" htmlFor="c-email" required><input id="c-email" type="email" required value={v.email} onChange={set("email")} className={inputCls} /></Field>
        <Field label="Telefon" htmlFor="c-phone"><input id="c-phone" type="tel" value={v.phone} onChange={set("phone")} className={inputCls} /></Field>
        <Field label="Bezirk/PLZ" htmlFor="c-district"><input id="c-district" value={v.district} onChange={set("district")} placeholder="z. B. 1070 Neubau" className={inputCls} /></Field>
        <Field label="Kategorie" htmlFor="c-cat">
          <select id="c-cat" value={v.category} onChange={set("category")} className={inputCls}>
            {OUTREACH_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </Field>
        <Field label="Website" htmlFor="c-web"><input id="c-web" value={v.website} onChange={set("website")} placeholder="https://" className={inputCls} /></Field>
        <Field label="Status" htmlFor="c-status">
          <select id="c-status" value={v.status} onChange={set("status")} className={inputCls}>
            {OUTREACH_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </Field>
        <Field label="Tags" htmlFor="c-tags" hint="Mit Komma getrennt, z. B. „Innenstadt, Messe“" className="sm:col-span-2"><input id="c-tags" value={v.tags} onChange={set("tags")} className={inputCls} /></Field>
        <Field label="Notiz" htmlFor="c-notes" className="sm:col-span-2">
          <textarea id="c-notes" rows={3} value={v.notes} onChange={set("notes")} className={`${inputCls} h-auto py-2`} />
        </Field>
      </div>
      {msg && <Banner tone={msg.ok ? "success" : "error"}>{msg.text}</Banner>}
      <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Wird gespeichert …" : contact ? "Speichern" : "Kontakt anlegen"}</button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  assignOrdersWithoutPartnerAction, deleteLedgerEntryAction, saveBillingFromAction, saveLedgerEntryAction, savePortalEmailsAction, type BillingActionState,
} from "@/app/admin/partner-abrechnung/actions";
import { Banner, Field, inputCls } from "./controls";
import { cn, formatPrice } from "@/lib/format";

function State({ state }: { state: BillingActionState }) {
  return state ? <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner> : null;
}

export function PortalEmailsForm({ partnerId, emails, usesDefault, defaults }: { partnerId: string; emails: string[]; usesDefault: boolean; defaults: string[] }) {
  const [state, action, pending] = useActionState<BillingActionState, FormData>(savePortalEmailsAction, null);
  const [useDefault, setUseDefault] = useState(usesDefault);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="partnerId" value={partnerId} />
      <State state={state} />
      <label className="flex items-start gap-2.5 text-[14px] text-ink">
        <input type="checkbox" name="useDefault" checked={useDefault} onChange={(e) => setUseDefault(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-forest" />
        <span>Auftrags-Adressen verwenden<span className="block text-[12.5px] text-ink-muted">{defaults.length ? `Derzeit: ${defaults.join(", ")}` : "Für diesen Partner ist keine Auftrags-Adresse hinterlegt (auch nicht über MAIL_FLORIST)."}</span></span>
      </label>
      {!useDefault && (
        <Field label="Portal-E-Mails" htmlFor="portal-emails" hint="Eine Adresse pro Zeile. Nur diese Adressen bekommen einen Login-Link. Entfernen beendet die Sitzung sofort.">
          <textarea id="portal-emails" name="emails" rows={3} defaultValue={emails.join("\n")} className={cn(inputCls, "h-auto resize-y py-2")} placeholder="name@floristik.at" />
        </Field>
      )}
      <Button type="submit" size="sm" loading={pending}>Portal-Zugang speichern</Button>
    </form>
  );
}

export function BillingFromForm({ partnerId, current, options }: { partnerId: string; current?: string; options: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<BillingActionState, FormData>(saveBillingFromAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="partnerId" value={partnerId} />
      <State state={state} />
      <Field label="Abrechnung ab – nach Bestellung" htmlFor="billing-from" hint="Es zählen nur Bestellungen, die NACH dieser Bestellung eingegangen sind (die gewählte selbst nicht).">
        <select id="billing-from" name="orderId" defaultValue={current ?? ""} className={cn(inputCls, "appearance-none")}>
          <option value="">– alle Bestellungen zählen –</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </Field>
      <Button type="submit" size="sm" loading={pending}>„Abrechnung ab“ speichern</Button>
    </form>
  );
}

export function LedgerEntryForm({ partnerId, kind, today, entry }: { partnerId: string; kind: "payment" | "correction"; today: string; entry?: { id: string; amount: number; date: string; note: string } }) {
  const [state, action, pending] = useActionState<BillingActionState, FormData>(saveLedgerEntryAction, null);
  const p = kind === "payment";
  const prefix = `${kind}-${entry?.id ?? "new"}`;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="partnerId" value={partnerId} />
      <input type="hidden" name="kind" value={kind} />
      {entry && <input type="hidden" name="entryId" value={entry.id} />}
      <State state={state} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
        <Field label={p ? "Betrag (€)" : "Betrag (+/− €)"} htmlFor={`${prefix}-amount`}>
          <input id={`${prefix}-amount`} name="amount" inputMode="decimal" required defaultValue={entry ? String(entry.amount).replace(".", ",") : ""} className={inputCls} placeholder={p ? "120,00" : "-15,00"} />
        </Field>
        <Field label="Datum" htmlFor={`${prefix}-date`}>
          <input id={`${prefix}-date`} name="date" type="date" required defaultValue={entry?.date ?? today} className={inputCls} />
        </Field>
        <Field label={p ? "Notiz" : "Grund"} htmlFor={`${prefix}-note`}>
          <input id={`${prefix}-note`} name="note" required={!p} defaultValue={entry?.note ?? ""} maxLength={300} className={inputCls} placeholder={p ? "z. B. Überweisung" : "z. B. Vase nachgeliefert"} />
        </Field>
      </div>
      <Button type="submit" size="sm" variant={entry ? "outline" : "primary"} loading={pending}>{entry ? "Änderung speichern" : p ? "Zahlung erfassen" : "Korrektur erfassen"}</Button>
    </form>
  );
}

export function DeleteLedgerEntryButton({ partnerId, entryId, label }: { partnerId: string; entryId: string; label: string }) {
  const [state, action, pending] = useActionState<BillingActionState, FormData>(deleteLedgerEntryAction, null);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(`${label} wirklich löschen?`)) e.preventDefault(); }} className="inline">
      <input type="hidden" name="partnerId" value={partnerId} />
      <input type="hidden" name="entryId" value={entryId} />
      <Button type="submit" size="sm" variant="ghost" loading={pending}>Löschen</Button>
      {state && !state.ok && <span className="ml-2 text-[12.5px] text-[#b42318]">{state.message}</span>}
    </form>
  );
}

export interface UnassignedRow { id: string; created: string; delivery: string; summary: string; recipient: string; total: number }

export function AssignOrdersForm({ partnerId, partnerName, rows }: { partnerId: string; partnerName: string; rows: UnassignedRow[] }) {
  const [state, action, pending] = useActionState<BillingActionState, FormData>(assignOrdersWithoutPartnerAction, null);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(`Die angekreuzten Bestellungen ${partnerName} zuordnen? Es geht keine Mail raus und kein Fahrer wird gebucht.`)) e.preventDefault(); }} className="space-y-4">
      <input type="hidden" name="partnerId" value={partnerId} />
      <State state={state} />
      <ul className="divide-y divide-[#efebe4] rounded-xl border border-[#e7e2d9] bg-white">
        {rows.map((r) => (
          <li key={r.id}>
            <label className="flex cursor-pointer items-start gap-3 px-4 py-3 text-[14px]">
              <input type="checkbox" name="orderId" value={r.id} className="mt-1 size-4 shrink-0 accent-forest" />
              <span className="min-w-0">
                <span className="font-semibold text-ink">{r.id}</span> <span className="text-ink-muted">· bestellt {r.created} · Lieferung {r.delivery}</span>
                <span className="block text-ink">{r.summary} <span className="text-ink-muted">· an {r.recipient} · {formatPrice(r.total)}</span></span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <label className="flex items-start gap-2.5 text-[14px] text-ink">
        <input type="checkbox" name="confirmed" defaultChecked className="mt-0.5 size-4 shrink-0 accent-forest" />
        <span>Gleich als bestätigt zählen<span className="block text-[12.5px] text-ink-muted">Für Aufträge, die {partnerName} schon gebunden hat – sie zählen dann sofort in der Abrechnung.</span></span>
      </label>
      <Button type="submit" size="sm" loading={pending}>Ohne Mail zuordnen</Button>
    </form>
  );
}

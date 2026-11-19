"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OrderStatus, OrderStatusDefinition } from "@/types";
import { assignPartnerAction, bookCourierAction, cancelCourierAction, resendOrderMailsAction, saveInternalNote, sendPartnerCancellationAction, sendReviewRequestAction, updateOrderStatus, type OrderActionState } from "@/app/admin/bestellungen/actions";
import { Banner, Field, inputCls } from "./controls";
import { cn } from "@/lib/format";

export function OrderStatusForm({ orderId, current, statuses, canRequestReview = false }: { orderId: string; current: OrderStatus; statuses: OrderStatusDefinition[]; canRequestReview?: boolean }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(updateOrderStatus, null);
  const [selected, setSelected] = useState<string>(current);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={orderId} />
      {state && <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>}
      <Field label="Neuer Status" htmlFor="status">
        <select id="status" name="status" defaultValue={current} onChange={(e) => setSelected(e.target.value)} className={cn(inputCls, "appearance-none")}>
          {statuses.map((s) => (
            <option key={s.key} value={s.key}>{s.label}{s.terminal ? " (Endstatus)" : ""}</option>
          ))}
        </select>
      </Field>
      <Field label="Notiz zum Statuswechsel" htmlFor="note" hint="Optional – wird im Verlauf gespeichert.">
        <textarea id="note" name="note" rows={2} className={cn(inputCls, "h-auto resize-y py-2")} placeholder="z. B. Zusteller: Max, Übergabe an Nachbarin" />
      </Field>
      {canRequestReview && selected === "delivered" && (
        <label className="flex items-start gap-2.5 text-[14px] text-ink">
          <input type="checkbox" name="sendReviewRequest" className="mt-0.5 size-4 shrink-0 accent-forest" />
          <span>Bewertungsanfrage gleich mitschicken<span className="block text-[12.5px] text-ink-muted">Sonst geht sie automatisch ab dem Tag nach der Zustellung raus.</span></span>
        </label>
      )}
      <Button type="submit" size="sm" loading={pending}>Status speichern</Button>
    </form>
  );
}

export function InternalNoteForm({ orderId, note }: { orderId: string; note?: string }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(saveInternalNote, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      {state && <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>}
      <textarea name="internalNote" defaultValue={note ?? ""} rows={4} className={cn(inputCls, "h-auto resize-y py-2")} placeholder="Nur für das Team sichtbar." aria-label="Interne Notiz" />
      <Button type="submit" size="sm" variant="outline" loading={pending}>Notiz speichern</Button>
    </form>
  );
}

/** Book / cancel the RiderX rider. Shown only when RiderX is configured. */
export function CourierForm({ orderId, canBook, canCancel }: { orderId: string; canBook: boolean; canCancel: boolean }) {
  const [bookState, book, booking] = useActionState<OrderActionState, FormData>(bookCourierAction, null);
  const [cancelState, cancel, cancelling] = useActionState<OrderActionState, FormData>(cancelCourierAction, null);
  const state = cancelState ?? bookState;
  return (
    <div className="space-y-3">
      {state && <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>}
      <div className="flex flex-wrap gap-2">
        {canBook && (
          <form action={book}>
            <input type="hidden" name="id" value={orderId} />
            <Button type="submit" size="sm" loading={booking}>Fahrer buchen</Button>
          </form>
        )}
        {canCancel && (
          <form action={cancel} onSubmit={(e) => { if (!confirm("RiderX-Fahrer wirklich stornieren?")) e.preventDefault(); }}>
            <input type="hidden" name="id" value={orderId} />
            <Button type="submit" size="sm" variant="outline" loading={cancelling}>Fahrer stornieren</Button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Send the order mails of a paid order again (to the real recipients). */
export function ResendMailsForm({ orderId, customerEmail }: { orderId: string; customerEmail: string }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(resendOrderMailsAction, null);
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        const which = (e.currentTarget.elements.namedItem("which") as HTMLSelectElement | null)?.value;
        const text = which === "customer" ? `Bestellbestätigung jetzt an ${customerEmail} senden?` : which === "internal" ? "Bestelleingang jetzt an euch senden?" : `Beide Mails jetzt senden (${customerEmail} und Bestelleingang)?`;
        if (!confirm(text)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={orderId} />
      {state && <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>}
      <Field label="Welche Mail?" htmlFor="resend-which">
        <select id="resend-which" name="which" defaultValue="all" className={cn(inputCls, "appearance-none")}>
          <option value="all">Beide (Kund:in und Bestelleingang)</option>
          <option value="customer">Kundenbestellung</option>
          <option value="internal">Bestelleingang</option>
        </select>
      </Field>
      <Button type="submit" size="sm" variant="outline" loading={pending}>Mails erneut senden</Button>
    </form>
  );
}

/** "Bewertungsanfrage jetzt senden" – manual review request (with confirm dialog). */
export function ReviewRequestForm({ orderId, customerEmail, delivered, lastSentLabel }: { orderId: string; customerEmail: string; delivered: boolean; lastSentLabel?: string | null }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(sendReviewRequestAction, null);
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        const lines = [`Bewertungsanfrage jetzt an ${customerEmail} senden?`];
        if (lastSentLabel) lines.push(`Sie wurde bereits am ${lastSentLabel} gesendet.`);
        if (!delivered) lines.push("Achtung: Die Bestellung ist noch nicht „Zugestellt“ – der Bewertungslink funktioniert erst nach der Zustellung.");
        if (!confirm(lines.join("\n\n"))) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={orderId} />
      {state && <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>}
      <Button type="submit" size="sm" variant="outline" loading={pending}>Bewertungsanfrage jetzt senden</Button>
    </form>
  );
}

/**
 * Assign the order to a partner florist and send the order slip; re-send it; move it to
 * another partner (the old one gets a cancellation); or send the cancellation by hand.
 */
export function PartnerForm({ orderId, partners, current, canAssign, note }: {
  orderId: string;
  partners: { id: string; name: string; reachable: boolean }[];
  current: { id: string; name: string; sent: boolean; cancelled: boolean } | null;
  /** Team note to the florist from the last slip – prefilled. */
  note?: string;
  canAssign: boolean;
}) {
  const [assignState, assign, assigning] = useActionState<OrderActionState, FormData>(assignPartnerAction, null);
  const [cancelState, cancel, cancelling] = useActionState<OrderActionState, FormData>(sendPartnerCancellationAction, null);
  const active = current && current.sent && !current.cancelled ? current : null;
  const [selected, setSelected] = useState<string>(current?.id ?? "");
  const chosen = partners.find((p) => p.id === selected);
  const label = !chosen ? "Partner auswählen" : active?.id === chosen.id ? "Auftrag erneut senden" : active ? `Zu ${chosen.name} wechseln` : "Zuordnen & Auftrag senden";
  const state = cancelState ?? assignState;
  return (
    <div className="space-y-3">
      {state && <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>}
      {canAssign && (
        <form
          action={assign}
          className="space-y-3"
          onSubmit={(e) => {
            if (!chosen) { e.preventDefault(); return; }
            const text = active?.id === chosen.id
              ? `Auftrag noch einmal an ${chosen.name} senden?`
              : active
                ? `${active.name} bekommt eine Storno-Mail („wird von einer anderen Floristik übernommen“), danach geht der Auftrag an ${chosen.name}. Fortfahren?`
                : `Auftrag jetzt an ${chosen.name} senden?`;
            if (!confirm(text)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={orderId} />
          <Field label="Partner" htmlFor="partnerId">
            <select id="partnerId" name="partnerId" value={selected} onChange={(e) => setSelected(e.target.value)} className={cn(inputCls, "appearance-none")}>
              <option value="">– bitte wählen –</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.reachable}>{p.name}{p.reachable ? "" : " (keine E-Mail hinterlegt)"}</option>
              ))}
            </select>
          </Field>
          <Field label="Hinweis an die Floristik (optional)" htmlFor="floristNote" hint="Steht fett und farbig ganz oben in der Auftrags-Mail, der Betreff beginnt mit „WICHTIGER HINWEIS“. Zum Ändern einfach Text anpassen und Auftrag erneut senden.">
            <textarea id="floristNote" name="floristNote" rows={3} maxLength={1000} defaultValue={note ?? ""} placeholder="z. B. Bitte ungerade Stückzahl (11 Rosen), Schleife mit Text „In Liebe, Anna“" className={cn(inputCls, "min-h-[88px] py-2.5")} />
          </Field>
          <Button type="submit" size="sm" loading={assigning} disabled={!chosen}>{label}</Button>
        </form>
      )}
      {active && (
        <form action={cancel} onSubmit={(e) => { if (!confirm(`Storno-Mail jetzt an ${active.name} senden? Der Partner bindet den Strauß dann nicht.`)) e.preventDefault(); }}>
          <input type="hidden" name="id" value={orderId} />
          <Button type="submit" size="sm" variant="ghost" loading={cancelling}>Storno an {active.name} senden</Button>
        </form>
      )}
    </div>
  );
}

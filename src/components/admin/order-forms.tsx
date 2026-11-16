"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { OrderStatus, OrderStatusDefinition } from "@/types";
import { bookCourierAction, cancelCourierAction, resendOrderMailsAction, saveInternalNote, updateOrderStatus, type OrderActionState } from "@/app/admin/bestellungen/actions";
import { Banner, Field, inputCls } from "./controls";
import { cn } from "@/lib/format";

export function OrderStatusForm({ orderId, current, statuses }: { orderId: string; current: OrderStatus; statuses: OrderStatusDefinition[] }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(updateOrderStatus, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={orderId} />
      {state && <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>}
      <Field label="Neuer Status" htmlFor="status">
        <select id="status" name="status" defaultValue={current} className={cn(inputCls, "appearance-none")}>
          {statuses.map((s) => (
            <option key={s.key} value={s.key}>{s.label}{s.terminal ? " (Endstatus)" : ""}</option>
          ))}
        </select>
      </Field>
      <Field label="Notiz zum Statuswechsel" htmlFor="note" hint="Optional – wird im Verlauf gespeichert.">
        <textarea id="note" name="note" rows={2} className={cn(inputCls, "h-auto resize-y py-2")} placeholder="z. B. Zusteller: Max, Übergabe an Nachbarin" />
      </Field>
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
        const text = which === "partner" ? "Auftrag jetzt an den Partner senden?" : which === "customer" ? `Bestellbestätigung jetzt an ${customerEmail} senden?` : which === "internal" ? "Bestelleingang jetzt an euch senden?" : `Alle drei Mails jetzt senden (Partner, ${customerEmail}, Bestelleingang)?`;
        if (!confirm(text)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={orderId} />
      {state && <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>}
      <Field label="Welche Mail?" htmlFor="resend-which">
        <select id="resend-which" name="which" defaultValue="all" className={cn(inputCls, "appearance-none")}>
          <option value="all">Alle (Partner, Kund:in, Bestelleingang)</option>
          <option value="partner">Partner-Auftrag</option>
          <option value="customer">Kundenbestellung</option>
          <option value="internal">Bestelleingang</option>
        </select>
      </Field>
      <Button type="submit" size="sm" variant="outline" loading={pending}>Mails erneut senden</Button>
    </form>
  );
}

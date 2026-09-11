"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { OrderStatus, OrderStatusDefinition } from "@/types";
import { saveInternalNote, updateOrderStatus, type OrderActionState } from "@/app/admin/bestellungen/actions";
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

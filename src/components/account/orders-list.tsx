import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import type { Order, OrderStatusDefinition } from "@/types";
import { formatDateShort, formatDateTime, formatPrice } from "@/lib/format";
import { routes } from "@/lib/urls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function tone(status: Order["status"]): "success" | "rose" | "sand" | "forest" {
  if (status === "delivered") return "success";
  if (status === "cancelled" || status === "undeliverable") return "rose";
  if (status === "in_transit") return "forest";
  return "sand";
}

/** Rendered server-side only – the tracking token never reaches a client component. */
export function OrdersList({ orders, statuses }: { orders: Order[]; statuses: OrderStatusDefinition[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone p-8 text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-ivory-200 text-forest"><Package className="size-5" strokeWidth={1.5} aria-hidden /></span>
        <p className="font-serif text-2xl text-ink">Noch keine Bestellungen</p>
        <p className="mt-2 text-[14px] text-ink-muted">Bestellungen mit dieser E-Mail-Adresse erscheinen hier automatisch.</p>
        <Button href={routes.shop} variant="outline" className="mt-6">Blumen entdecken</Button>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-white/60">
      {orders.map((o) => {
        const def = statuses.find((s) => s.key === o.status);
        const href = `/bestellung/${encodeURIComponent(o.id)}?token=${encodeURIComponent(o.token)}`;
        return (
          <li key={o.id}>
            <Link href={href} className="group grid gap-3 p-5 transition-colors hover:bg-ivory-100/70 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-serif text-[21px] leading-none text-ink">{o.id}</span>
                  <Badge tone={tone(o.status)}>{def?.label ?? o.status}</Badge>
                </div>
                <p className="mt-2 text-[13.5px] text-ink-muted">
                  Bestellt am {formatDateTime(o.createdAt)} · Lieferung {formatDateShort(o.delivery.date)}{o.delivery.windowLabel ? `, ${o.delivery.windowLabel}` : ""}
                </p>
                <p className="mt-1 text-[13.5px] text-ink-muted">
                  Für {o.recipient.firstName} {o.recipient.lastName} · {o.lines.map((l) => `${l.quantity > 1 ? `${l.quantity}× ` : ""}${l.productName}`).join(", ")}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
                <span className="font-serif text-[22px] tabular-nums leading-none text-ink">{formatPrice(o.totals.total)}</span>
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-forest">Details <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

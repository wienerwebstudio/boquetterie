import { ArrowRight, MapPin } from "lucide-react";
import type { Order } from "@/types";
import { formatDateShort, pluralize } from "@/lib/format";
import { routes } from "@/lib/urls";
import { Button } from "@/components/ui/button";

export interface RecipientSummary {
  key: string;
  name: string;
  company?: string;
  addressLine: string;
  cityLine: string;
  orders: number;
  lastDelivery: string; // YYYY-MM-DD
}

/** Unique recipients across past orders (newest delivery first). */
export function deriveRecipients(orders: Order[]): RecipientSummary[] {
  const map = new Map<string, RecipientSummary>();
  for (const o of orders) {
    const r = o.recipient;
    const key = [r.firstName, r.lastName, r.street, r.houseNumber, r.zip].map((s) => s.trim().toLowerCase()).join("|");
    const hit = map.get(key);
    if (hit) {
      hit.orders += 1;
      if (o.delivery.date > hit.lastDelivery) hit.lastDelivery = o.delivery.date;
      continue;
    }
    map.set(key, {
      key,
      name: `${r.firstName} ${r.lastName}`.trim(),
      company: r.company,
      addressLine: `${r.street} ${r.houseNumber}${r.addition ? `, ${r.addition}` : ""}`,
      cityLine: `${r.zip} ${r.city}`,
      orders: 1,
      lastDelivery: o.delivery.date,
    });
  }
  return [...map.values()].sort((a, b) => b.lastDelivery.localeCompare(a.lastDelivery));
}

export function RecipientsList({ recipients }: { recipients: RecipientSummary[] }) {
  if (recipients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone p-8 text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-ivory-200 text-forest"><MapPin className="size-5" strokeWidth={1.5} aria-hidden /></span>
        <p className="font-serif text-2xl text-ink">Noch keine Empfänger:innen</p>
        <p className="mt-2 text-[14px] text-ink-muted">Sobald du Blumen verschickt hast, findest du die Adressen hier wieder.</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {recipients.map((r) => (
        <li key={r.key} className="flex flex-col rounded-lg border border-line bg-white/60 p-5 sm:p-6">
          <p className="font-serif text-[22px] leading-tight text-ink">{r.name}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
            {r.company && <>{r.company}<br /></>}
            {r.addressLine}<br />{r.cityLine}
          </p>
          <p className="mt-3 text-[12.5px] text-ink-soft">{pluralize(r.orders, "Lieferung", "Lieferungen")} · zuletzt {formatDateShort(r.lastDelivery)}</p>
          <Button href={routes.shop} variant="outline" size="sm" className="mt-5 self-start" iconRight={<ArrowRight className="size-3.5" aria-hidden />}>Erneut Blumen schicken</Button>
        </li>
      ))}
    </ul>
  );
}

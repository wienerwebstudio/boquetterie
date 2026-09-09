"use client";
import { Flower2, MessageSquare, Gift } from "lucide-react";
import type { CartItem } from "@/types";
import { cn } from "@/lib/format";
import { truncateMessage } from "@/lib/cart-helpers";

/** "Deine Überraschung" – what the recipient will unwrap: bouquet, card, extras. */
export function CartSurprise({ items, className }: { items: CartItem[]; className?: string }) {
  if (!items.length) return null;
  const bouquets = items.map((i) => `${i.snapshot.name} (${i.snapshot.sizeLabel})${i.quantity > 1 ? ` × ${i.quantity}` : ""}`);
  const withMessage = items.find((i) => i.message);
  const extras = new Map<string, number>();
  items.forEach((i) => i.extras.forEach((e) => extras.set(e.name, (extras.get(e.name) ?? 0) + e.quantity)));
  const extrasList = Array.from(extras.entries()).map(([name, q]) => (q > 1 ? `${q} × ${name}` : name));

  const rows = [
    { icon: Flower2, label: "Strauß", value: bouquets.join(", ") },
    {
      icon: MessageSquare,
      label: "+ Karte",
      value: withMessage?.message ? `„${truncateMessage(withMessage.message, 44)}“` : "Grußkarte inklusive – Nachricht jederzeit ergänzbar",
      muted: !withMessage,
    },
    { icon: Gift, label: "+ Extras", value: extrasList.length ? extrasList.join(", ") : "Noch keine Extras", muted: !extrasList.length },
  ];

  return (
    <section className={cn("rounded-md bg-ivory-100 p-4", className)} aria-labelledby="cart-surprise-title">
      <h3 id="cart-surprise-title" className="eyebrow mb-3">Deine Überraschung</h3>
      <ul className="space-y-2">
        {rows.map(({ icon: Icon, label, value, muted }) => (
          <li key={label} className="flex items-start gap-2.5 text-[13.5px]">
            <Icon className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={1.5} aria-hidden />
            <span className="w-16 shrink-0 font-semibold text-ink">{label}</span>
            <span className={cn("min-w-0 flex-1", muted ? "text-ink-soft" : "text-ink")}>{value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

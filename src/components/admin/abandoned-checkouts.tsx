import type { CheckoutDraft } from "@/types";
import { formatDateShort, formatDateTime, formatPrice } from "@/lib/format";
import { EmptyState, Table, Td, Th } from "@/components/admin/controls";
import { DeleteDraftForm } from "@/components/admin/order-forms";
import { orderLanguage } from "@/components/admin/order-utils";

const WALLETS: Record<string, string> = { apple_pay: "Apple Pay", google_pay: "Google Pay", link: "Link" };

/**
 * "Abgebrochene Kasse": checkouts that reached the payment step (or an Express-Kauf wallet
 * sheet that was closed) without an order. Contact data for a follow-up call; entries go
 * away when the same session creates an order, by hand, or after 30 days.
 */
export function AbandonedCheckouts({ drafts }: { drafts: CheckoutDraft[] }) {
  if (drafts.length === 0) return <EmptyState>Keine abgebrochenen Kassenvorgänge. Einträge entstehen, sobald jemand im Checkout die Kontaktdaten ausfüllt (Schritt 4) und nicht bestellt, oder ein Express-Kauf-Fenster schließt.</EmptyState>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Zuletzt</Th><Th>Kontakt</Th><Th>Warenkorb</Th><Th>Lieferung</Th><Th className="text-right">Summe (ca.)</Th><Th><span className="sr-only">Aktionen</span></Th>
        </tr>
      </thead>
      <tbody>
        {drafts.map((d) => {
          const language = orderLanguage({ locale: d.locale as never });
          const name = d.contact ? `${d.contact.firstName} ${d.contact.lastName}`.trim() : "";
          const zip = d.recipient?.zip || d.express?.postalCode;
          return (
            <tr key={d.id} data-testid="abandoned-checkout">
              <Td className="min-w-[110px] text-[13px] text-[#5f5c56]">
                {formatDateTime(d.updatedAt)}
                <div className="text-[12px] text-ink-soft">{d.source === "express" ? `Express-Kauf${d.express?.wallet ? ` · ${WALLETS[d.express.wallet] ?? d.express.wallet}` : ""}` : `Kasse, Schritt ${d.step ?? 5}`}</div>
              </Td>
              <Td>
                {d.contact ? (
                  <>
                    <div className="font-semibold">{name || "–"}</div>
                    {d.contact.email ? <a href={`mailto:${d.contact.email}`} className="block text-[13px] text-[#0a6644] underline-offset-4 hover:underline">{d.contact.email}</a> : null}
                    {d.contact.phone ? <a href={`tel:${d.contact.phone.replace(/[^\d+]/g, "")}`} className="block text-[13px] text-[#0a6644] underline-offset-4 hover:underline">{d.contact.phone}</a> : null}
                  </>
                ) : (
                  <span className="text-[13px] text-ink-muted">Express – keine Kontaktdaten (Apple/Google geben sie erst beim Bezahlen frei)</span>
                )}
                {language ? <div className="text-[12px] text-ink-soft">auf {language}</div> : null}
              </Td>
              <Td className="text-[13px]">
                <ul className="space-y-0.5">
                  {d.lines.map((l, i) => (
                    <li key={i}>
                      {l.quantity}× {l.name}{l.sizeLabel ? ` (${l.sizeLabel}${l.color ? `, ${l.color}` : ""})` : l.color ? ` (${l.color})` : ""}
                      {l.extras?.length ? <span className="text-ink-soft"> + {l.extras.map((e) => `${e.quantity}× ${e.name}`).join(", ")}</span> : null}
                    </li>
                  ))}
                </ul>
                {d.couponCode ? <div className="text-[12px] text-ink-soft">Gutschein {d.couponCode}</div> : null}
              </Td>
              <Td className="text-[13px]">
                {d.delivery?.date ? <div className="whitespace-nowrap">{formatDateShort(d.delivery.date)}</div> : <div className="text-ink-soft">kein Liefertag</div>}
                {d.delivery?.windowLabel ? <div className="text-[12px] text-ink-soft">{d.delivery.windowLabel}</div> : null}
                {d.recipient ? (
                  <div className="mt-1 text-[12px] text-ink-soft">
                    an {`${d.recipient.firstName} ${d.recipient.lastName}`.trim()}, {d.recipient.street} {d.recipient.houseNumber}, {d.recipient.zip} {d.recipient.city}
                  </div>
                ) : zip ? (
                  <div className="mt-1 text-[12px] text-ink-soft">PLZ {zip}{d.express?.city ? ` ${d.express.city}` : ""}{d.express?.country && d.express.country !== "AT" ? ` (${d.express.country})` : ""}</div>
                ) : null}
              </Td>
              <Td className="whitespace-nowrap text-right font-semibold tabular-nums">
                {typeof d.totalEstimate === "number" ? formatPrice(d.totalEstimate) : "–"}
                {d.totalComplete === false ? <div className="text-[11.5px] font-normal text-ink-soft">ohne Lieferung</div> : null}
              </Td>
              <Td className="text-right"><DeleteDraftForm draftId={d.id} /></Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

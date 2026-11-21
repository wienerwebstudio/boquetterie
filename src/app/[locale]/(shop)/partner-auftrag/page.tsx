import type { Metadata } from "next";
import { getOrderById } from "@/lib/cms";
import { formatDateLong } from "@/lib/format";
import { tokenMatches } from "@/lib/mail/reminders";
import { floristSize } from "@/lib/mail/templates";
import { ConfirmForm } from "./confirm-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Auftrag bestätigen",
  robots: { index: false, follow: false },
};

function Box({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="mx-auto max-w-lg">
        <p className="eyebrow mb-3">Partner-Auftrag</p>
        <h1 className="display-2 text-ink">{title}</h1>
        <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-ink-muted">{children}</div>
      </div>
    </div>
  );
}

/**
 * Landing page of the "Auftrag bestätigen" button in the partner's order slip. A GET
 * never confirms anything (mail scanners open links) – the partner presses the button.
 */
export default async function PartnerConfirmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const orderId = typeof sp.order === "string" ? sp.order.trim().toUpperCase() : "";
  const token = typeof sp.token === "string" ? sp.token : "";
  const order = orderId ? await getOrderById(orderId) : null;
  const p = order?.partner;

  if (!order || !p?.confirmToken || !tokenMatches(p.confirmToken, token)) {
    return <Box title="Link nicht gültig"><p>Der Link ist unvollständig oder gehört zu einem älteren Auftrag. Bitte nehmt den Link aus der neuesten Auftragsmail oder antwortet einfach auf die Mail.</p></Box>;
  }
  if (p.cancelSentAt || order.status === "cancelled") {
    return <Box title="Auftrag storniert"><p>Auftrag {order.id} wurde storniert oder an eine andere Floristik vergeben – bitte <strong className="text-ink">nicht binden</strong>.</p></Box>;
  }
  return (
    <Box title={p.confirmedAt ? `Auftrag ${order.id} ist bestätigt` : `Auftrag ${order.id} bestätigen`}>
      <p>{p.name} · Lieferung am <strong className="text-ink">{formatDateLong(order.delivery.date)}</strong>{order.delivery.windowLabel ? `, ${order.delivery.windowLabel}` : ""}</p>
      <ul className="list-disc pl-5 text-ink">
        {order.lines.map((l, i) => (
          <li key={i}>{l.quantity > 1 ? `${l.quantity} × ` : ""}{l.productName} – Größe {floristSize(l)}{l.extras.length ? ` + ${l.extras.map((e) => e.name).join(", ")}` : ""}</li>
        ))}
      </ul>
      {p.confirmedAt ? <p className="text-forest">Danke – ihr habt den Auftrag bereits bestätigt.</p> : <ConfirmForm orderId={order.id} token={token} />}
    </Box>
  );
}

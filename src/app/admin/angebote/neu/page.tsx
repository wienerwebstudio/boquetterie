import Link from "next/link";
import { Banner, PageHeader } from "@/components/admin/controls";
import { OfferForm } from "@/components/admin/offer-form";
import { getAllProducts, getCustomRequestById } from "@/lib/cms";
import { CUSTOM_REQUEST_ID_RE, customRequestToOfferForm } from "@/lib/custom-requests-core";
import { emptyOfferForm, offerFormContext } from "../form-data";

export const dynamic = "force-dynamic";

/** `?anfrage=AF-…` prefills the form from a customer request (admin → Anfragen → „Angebot erstellen“). */
export default async function NewOfferPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const requestId = typeof sp.anfrage === "string" && CUSTOM_REQUEST_ID_RE.test(sp.anfrage) ? sp.anfrage : null;
  const [ctx, request, products] = await Promise.all([offerFormContext(), requestId ? getCustomRequestById(requestId) : null, requestId ? getAllProducts(true) : []]);
  const base = emptyOfferForm(ctx.today);
  const initial = request
    ? customRequestToOfferForm(request, base, { products: products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, sizes: p.sizes })), locales: ctx.locales.map((l) => l.id) })
    : base;
  return (
    <>
      <PageHeader back={request ? { href: `/admin/anfragen/${request.id}`, label: `Anfrage ${request.id}` } : { href: "/admin/angebote", label: "Angebote" }} title="Neues Angebot" description="Positionen, Lieferung und Preis festlegen – die Summe rechnet live mit. Gespeichert wird zuerst als Entwurf; „Speichern & senden“ schickt die Mail mit dem Bezahl-Link." />
      {request && (
        <Banner tone="info" className="mb-5">
          Vorausgefüllt aus <Link href={`/admin/anfragen/${request.id}`} className="font-semibold underline underline-offset-4">Anfrage {request.id}</Link> – bitte Positionen, Preis, Adresse und Empfänger:in prüfen. Nach dem Speichern wird das Angebot mit der Anfrage verknüpft.
          {request.offerId && <> Achtung: Zu dieser Anfrage gibt es schon das Angebot <Link href={`/admin/angebote/${request.offerId}`} className="font-semibold underline underline-offset-4">{request.offerId}</Link>.</>}
        </Banner>
      )}
      {requestId && !request && <Banner tone="warn" className="mb-5">Anfrage {requestId} nicht gefunden – leeres Formular.</Banner>}
      <OfferForm id={null} initial={initial} catalog={ctx.catalog} zones={ctx.zones} blackoutDates={ctx.blackoutDates} cardsEnabled={ctx.cardsEnabled} locales={ctx.locales} requestId={request?.id} />
    </>
  );
}

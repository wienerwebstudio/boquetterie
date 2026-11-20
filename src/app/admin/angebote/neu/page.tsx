import { PageHeader } from "@/components/admin/controls";
import { OfferForm } from "@/components/admin/offer-form";
import { emptyOfferForm, offerFormContext } from "../form-data";

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  const ctx = await offerFormContext();
  return (
    <>
      <PageHeader back={{ href: "/admin/angebote", label: "Angebote" }} title="Neues Angebot" description="Positionen, Lieferung und Preis festlegen – die Summe rechnet live mit. Gespeichert wird zuerst als Entwurf; „Speichern & senden“ schickt die Mail mit dem Bezahl-Link." />
      <OfferForm id={null} initial={emptyOfferForm(ctx.today)} catalog={ctx.catalog} zones={ctx.zones} blackoutDates={ctx.blackoutDates} cardsEnabled={ctx.cardsEnabled} locales={ctx.locales} />
    </>
  );
}

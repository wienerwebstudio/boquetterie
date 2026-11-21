import { notFound, redirect } from "next/navigation";
import { getOfferById } from "@/lib/cms";
import { Banner, PageHeader } from "@/components/admin/controls";
import { OfferForm } from "@/components/admin/offer-form";
import { offerFormContext, offerToForm } from "../../form-data";

export const dynamic = "force-dynamic";

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [offer, ctx] = await Promise.all([getOfferById(decodeURIComponent(id)), offerFormContext()]);
  if (!offer) notFound();
  if (offer.status === "paid" || offer.status === "cancelled") redirect(`/admin/angebote/${offer.id}`);
  return (
    <>
      <PageHeader back={{ href: `/admin/angebote/${offer.id}`, label: offer.id }} title={`Angebot ${offer.id} bearbeiten`} />
      {offer.sentAt && <Banner tone="warn" className="mb-5">Dieses Angebot wurde schon gesendet. Nach dem Speichern bitte erneut senden – ein schon begonnener Bezahlvorgang wird dann neu gestartet.</Banner>}
      <OfferForm id={offer.id} initial={offerToForm(offer)} catalog={ctx.catalog} zones={ctx.zones} blackoutDates={ctx.blackoutDates} cardsEnabled={ctx.cardsEnabled} locales={ctx.locales} />
    </>
  );
}

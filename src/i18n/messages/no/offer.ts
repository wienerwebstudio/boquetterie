import type { PartialMessages } from "@/i18n/messages";

/** no – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Ditt tilbud",
  eyebrow: "Personlig tilbud {id}",
  title: "Ditt personlige tilbud",
  intro: "Hei, {name}, her er tilbudet ditt. Se gjennom alt i ro og mak, og betal trygt på nett.",
  items: "Dine blomster",
  delivery: "Levering",
  date: "Tidspunkt",
  place: "Leveringssted",
  recipient: "Mottaker",
  card: "Hilsenkort",
  flowers: "Blomster",
  extras: "Ekstra",
  deliveryFee: "Levering",
  free: "gratis",
  validUntil: "Gyldig til {date}",
  payTitle: "Betaling",
  pay: "Betal nå · {total}",
  acceptTerms: "Jeg har lest {terms} og {withdrawal}.",
  acceptTermsError: "Bekreft vilkårene.",
  paidTitle: "Takk – allerede betalt",
  paidText: "Dette tilbudet er betalt. Ordrebekreftelsen har du fått på e-post.",
  viewOrder: "Se bestillingen",
  expiredTitle: "Tilbudet er utløpt",
  expiredText: "Dette tilbudet er ikke lenger gyldig. Skriv gjerne til oss – så lager vi et nytt til deg.",
  cancelledTitle: "Tilbudet er ikke lenger tilgjengelig",
  cancelledText: "Dette tilbudet er trukket tilbake. Har du spørsmål, skriv gjerne til oss.",
  cancelledPayment: "Betalingen ble ikke fullført. Du kan prøve igjen.",
  failed: "Betalingen kunne ikke startes. Prøv igjen.",
  byArrangement: "Etter avtale",
  previewTitle: "Forhåndsvisning – ikke sendt ennå",
  previewText: "Dette tilbudet er fortsatt et utkast. Slik ser kunden det. Betaling er først mulig etter at dere har sendt det eller kopiert lenken.",
};

export default offer;

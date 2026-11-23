import type { PartialMessages } from "@/i18n/messages";

/** nl – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Je offerte",
  eyebrow: "Persoonlijke offerte {id}",
  title: "Je persoonlijke offerte",
  intro: "Hallo {name}, hier is je offerte. Bekijk alles rustig en betaal veilig online.",
  items: "Je bloemen",
  delivery: "Bezorging",
  date: "Datum",
  place: "Bezorgadres",
  recipient: "Ontvanger",
  card: "Kaartje",
  flowers: "Bloemen",
  extras: "Extra's",
  deliveryFee: "Bezorging",
  free: "gratis",
  validUntil: "Geldig tot {date}",
  payTitle: "Betaling",
  pay: "Nu betalen · {total}",
  acceptTerms: "Ik heb de {terms} en de {withdrawal} gelezen.",
  acceptTermsError: "Bevestig de algemene voorwaarden.",
  paidTitle: "Bedankt – al betaald",
  paidText: "Deze offerte is betaald. Je orderbevestiging heb je per e-mail ontvangen.",
  viewOrder: "Bestelling bekijken",
  expiredTitle: "Offerte verlopen",
  expiredText: "Deze offerte is niet meer geldig. Stuur ons gerust een bericht – dan maken we een nieuwe voor je.",
  cancelledTitle: "Offerte niet meer beschikbaar",
  cancelledText: "Deze offerte is ingetrokken. Heb je vragen, stuur ons dan gerust een bericht.",
  cancelledPayment: "De betaling is niet afgerond. Je kunt het nog een keer proberen.",
  failed: "De betaling kon niet worden gestart. Probeer het nog een keer.",
  byArrangement: "In overleg",
  previewTitle: "Voorbeeld – nog niet verzonden",
  previewText: "Deze offerte is nog een concept. Zo ziet de klant hem. Betalen kan pas nadat jullie hem hebben verzonden of de link hebben gekopieerd.",
};

export default offer;

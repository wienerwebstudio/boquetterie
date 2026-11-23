import type { PartialMessages } from "@/i18n/messages";

/** da – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Dit tilbud",
  eyebrow: "Personligt tilbud {id}",
  title: "Dit personlige tilbud",
  intro: "Hej {name}, her er dit tilbud. Se det hele igennem i ro og mag, og betal sikkert online.",
  items: "Dine blomster",
  delivery: "Levering",
  date: "Tidspunkt",
  place: "Leveringssted",
  recipient: "Modtager",
  card: "Hilsenkort",
  flowers: "Blomster",
  extras: "Ekstra",
  deliveryFee: "Levering",
  free: "gratis",
  validUntil: "Gyldigt til {date}",
  payTitle: "Betaling",
  pay: "Betal nu · {total}",
  acceptTerms: "Jeg har læst {terms} og {withdrawal}.",
  acceptTermsError: "Bekræft venligst handelsbetingelserne.",
  paidTitle: "Tak – allerede betalt",
  paidText: "Dette tilbud er betalt. Du har fået din ordrebekræftelse på e-mail.",
  viewOrder: "Se bestilling",
  expiredTitle: "Tilbuddet er udløbet",
  expiredText: "Dette tilbud er ikke længere gyldigt. Skriv gerne til os – så laver vi et nyt til dig.",
  cancelledTitle: "Tilbuddet er ikke længere tilgængeligt",
  cancelledText: "Dette tilbud er trukket tilbage. Skriv gerne til os, hvis du har spørgsmål.",
  cancelledPayment: "Betalingen blev ikke gennemført. Du kan prøve igen.",
  failed: "Betalingen kunne ikke startes. Prøv venligst igen.",
  byArrangement: "Efter aftale",
  previewTitle: "Forhåndsvisning – endnu ikke sendt",
  previewText: "Dette tilbud er stadig et udkast. Sådan ser kunden det. Betaling er først mulig, når I har sendt det eller kopieret linket.",
};

export default offer;

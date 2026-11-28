import type { PartialMessages } from "@/i18n/messages";

/** sv – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Din offert",
  eyebrow: "Personlig offert {id}",
  title: "Din personliga offert",
  intro: "Hej {name}, här är din offert. Kontrollera allt i lugn och ro och betala säkert online.",
  items: "Dina blommor",
  delivery: "Leverans",
  date: "Datum",
  place: "Leveransplats",
  recipient: "Mottagare",
  card: "Hälsningskort",
  flowers: "Blommor",
  extras: "Tillbehör",
  deliveryFee: "Leverans",
  free: "kostnadsfri",
  validUntil: "Giltig till {date}",
  payTitle: "Betalning",
  pay: "Betala nu · {total}",
  acceptTerms: "Jag har läst {terms} och {withdrawal}.",
  acceptTermsError: "Bekräfta de allmänna villkoren.",
  paidTitle: "Tack – redan betald",
  paidText: "Den här offerten är betald. Du har fått din orderbekräftelse via e-post.",
  viewOrder: "Visa beställningen",
  expiredTitle: "Offerten har gått ut",
  expiredText: "Den här offerten gäller inte längre. Skriv gärna till oss – vi tar fram en ny åt dig.",
  cancelledTitle: "Offerten är inte längre tillgänglig",
  cancelledText: "Den här offerten har dragits tillbaka. Skriv gärna till oss om du har frågor.",
  cancelledPayment: "Betalningen slutfördes inte. Du kan försöka igen.",
  failed: "Betalningen kunde inte startas. Försök igen.",
  byArrangement: "Enligt överenskommelse",
  previewTitle: "Förhandsvisning – inte skickad än",
  previewText: "Den här offerten är fortfarande ett utkast. Så här ser kunden den. Betalning är möjlig först när ni har skickat den eller kopierat länken.",
};

export default offer;

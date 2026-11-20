import type { PartialMessages } from "@/i18n/messages";

/** bks – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Vaša ponuda",
  eyebrow: "Lična ponuda {id}",
  title: "Vaša lična ponuda",
  intro: "Dobar dan, {name}, ovdje je Vaša ponuda. Provjerite sve u miru i platite sigurno online.",
  items: "Vaše cvijeće",
  delivery: "Dostava",
  date: "Datum i vrijeme",
  place: "Mjesto dostave",
  recipient: "Primalac",
  card: "Čestitka",
  flowers: "Cvijeće",
  extras: "Dodaci",
  deliveryFee: "Dostava",
  free: "besplatno",
  validUntil: "Vrijedi do {date}",
  payTitle: "Plaćanje",
  pay: "Platite sada · {total}",
  acceptTerms: "Pročitao/la sam {terms} i {withdrawal}.",
  acceptTermsError: "Molimo potvrdite opće uslove poslovanja.",
  paidTitle: "Hvala – već plaćeno",
  paidText: "Ova ponuda je plaćena. Potvrdu narudžbe ste dobili e-poštom.",
  viewOrder: "Pogledaj narudžbu",
  expiredTitle: "Ponuda je istekla",
  expiredText: "Ova ponuda više ne vrijedi. Pišite nam – rado ćemo Vam napraviti novu.",
  cancelledTitle: "Ponuda više nije dostupna",
  cancelledText: "Ova ponuda je povučena. Za pitanja nam slobodno pišite.",
  cancelledPayment: "Plaćanje nije završeno. Možete pokušati ponovo.",
  failed: "Plaćanje nije moglo započeti. Molimo pokušajte ponovo.",
  byArrangement: "Po dogovoru",
};

export default offer;

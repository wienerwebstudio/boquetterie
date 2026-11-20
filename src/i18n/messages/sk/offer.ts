import type { PartialMessages } from "@/i18n/messages";

/** sk – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Vaša ponuka",
  eyebrow: "Osobná ponuka {id}",
  title: "Vaša osobná ponuka",
  intro: "Dobrý deň, {name}, tu je vaša ponuka. Všetko si v pokoji skontrolujte a bezpečne zaplaťte online.",
  items: "Vaše kvety",
  delivery: "Doručenie",
  date: "Dátum a čas",
  place: "Miesto doručenia",
  recipient: "Príjemca",
  card: "Pozdravná kartička",
  flowers: "Kvety",
  extras: "Doplnky",
  deliveryFee: "Doručenie",
  free: "zadarmo",
  validUntil: "Platí do {date}",
  payTitle: "Platba",
  pay: "Zaplatiť teraz · {total}",
  acceptTerms: "Prečítal/a som si {terms} a {withdrawal}.",
  acceptTermsError: "Prosím, potvrďte VOP.",
  paidTitle: "Ďakujeme – už zaplatené",
  paidText: "Táto ponuka je zaplatená. Potvrdenie objednávky ste dostali e-mailom.",
  viewOrder: "Zobraziť objednávku",
  expiredTitle: "Platnosť ponuky vypršala",
  expiredText: "Táto ponuka už neplatí. Napíšte nám – radi vám pripravíme novú.",
  cancelledTitle: "Ponuka už nie je dostupná",
  cancelledText: "Táto ponuka bola stiahnutá. Ak máte otázky, napíšte nám.",
  cancelledPayment: "Platba nebola dokončená. Môžete to skúsiť znova.",
  failed: "Platbu sa nepodarilo spustiť. Skúste to prosím znova.",
  byArrangement: "Podľa dohody",
};

export default offer;

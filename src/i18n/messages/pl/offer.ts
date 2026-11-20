import type { PartialMessages } from "@/i18n/messages";

/** pl – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Twoja oferta",
  eyebrow: "Oferta indywidualna {id}",
  title: "Twoja indywidualna oferta",
  intro: "Cześć, {name}! Oto Twoja oferta. Sprawdź wszystko spokojnie i zapłać bezpiecznie online.",
  items: "Twoje kwiaty",
  delivery: "Dostawa",
  date: "Data i godzina",
  place: "Miejsce dostawy",
  recipient: "Odbiorca",
  card: "Kartka z życzeniami",
  flowers: "Kwiaty",
  extras: "Dodatki",
  deliveryFee: "Dostawa",
  free: "bezpłatnie",
  validUntil: "Ważna do {date}",
  payTitle: "Płatność",
  pay: "Zapłać teraz · {total}",
  acceptTerms: "Potwierdzam zapoznanie się z {terms} i {withdrawal}.",
  acceptTermsError: "Potwierdź regulamin.",
  paidTitle: "Dziękujemy – już opłacone",
  paidText: "Ta oferta została opłacona. Potwierdzenie zamówienia wysłaliśmy Ci e-mailem.",
  viewOrder: "Zobacz zamówienie",
  expiredTitle: "Oferta wygasła",
  expiredText: "Ta oferta jest już nieważna. Napisz do nas – chętnie przygotujemy nową.",
  cancelledTitle: "Oferta jest już niedostępna",
  cancelledText: "Ta oferta została wycofana. W razie pytań napisz do nas.",
  cancelledPayment: "Płatność nie została zakończona. Możesz spróbować ponownie.",
  failed: "Nie udało się rozpocząć płatności. Spróbuj ponownie.",
  byArrangement: "Według ustaleń",
};

export default offer;

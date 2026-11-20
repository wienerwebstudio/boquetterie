import type { PartialMessages } from "@/i18n/messages";

/** ro – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Oferta ta",
  eyebrow: "Ofertă personalizată {id}",
  title: "Oferta ta personalizată",
  intro: "Bună, {name}! Iată oferta ta. Verifică totul în liniște și plătește în siguranță online.",
  items: "Florile tale",
  delivery: "Livrare",
  date: "Data și ora",
  place: "Locul livrării",
  recipient: "Destinatar",
  card: "Felicitare",
  flowers: "Flori",
  extras: "Extra",
  deliveryFee: "Livrare",
  free: "gratuit",
  validUntil: "Valabilă până la {date}",
  payTitle: "Plată",
  pay: "Plătește acum · {total}",
  acceptTerms: "Am citit {terms} și {withdrawal}.",
  acceptTermsError: "Te rugăm să confirmi termenii și condițiile.",
  paidTitle: "Mulțumim – deja plătită",
  paidText: "Această ofertă a fost plătită. Ai primit confirmarea comenzii pe e-mail.",
  viewOrder: "Vezi comanda",
  expiredTitle: "Oferta a expirat",
  expiredText: "Această ofertă nu mai este valabilă. Scrie-ne – îți pregătim cu drag una nouă.",
  cancelledTitle: "Oferta nu mai este disponibilă",
  cancelledText: "Această ofertă a fost retrasă. Pentru întrebări, scrie-ne.",
  cancelledPayment: "Plata nu a fost finalizată. Poți încerca din nou.",
  failed: "Plata nu a putut fi inițiată. Te rugăm să încerci din nou.",
  byArrangement: "Conform înțelegerii",
};

export default offer;

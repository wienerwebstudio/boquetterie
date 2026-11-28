import type { PartialMessages } from "@/i18n/messages";

/** fi – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Tarjouksesi",
  eyebrow: "Henkilökohtainen tarjous {id}",
  title: "Henkilökohtainen tarjouksesi",
  intro: "Hei {name}, tässä on tarjouksesi. Tarkista kaikki rauhassa ja maksa turvallisesti verkossa.",
  items: "Kukkasi",
  delivery: "Toimitus",
  date: "Ajankohta",
  place: "Toimituspaikka",
  recipient: "Vastaanottaja",
  card: "Tervehdyskortti",
  flowers: "Kukat",
  extras: "Lisät",
  deliveryFee: "Toimitus",
  free: "maksuton",
  validUntil: "Voimassa {date} asti",
  payTitle: "Maksu",
  pay: "Maksa nyt · {total}",
  acceptTerms: "Olen lukenut {terms} ja {withdrawal}.",
  acceptTermsError: "Vahvista yleiset sopimusehdot.",
  paidTitle: "Kiitos – jo maksettu",
  paidText: "Tämä tarjous on maksettu. Olet saanut tilausvahvistuksen sähköpostitse.",
  viewOrder: "Katso tilaus",
  expiredTitle: "Tarjous vanhentunut",
  expiredText: "Tämä tarjous ei ole enää voimassa. Kirjoita meille – teemme sinulle uuden.",
  cancelledTitle: "Tarjous ei ole enää saatavilla",
  cancelledText: "Tämä tarjous on peruttu. Jos sinulla on kysyttävää, kirjoita meille.",
  cancelledPayment: "Maksua ei viety loppuun. Voit yrittää uudelleen.",
  failed: "Maksua ei voitu aloittaa. Yritä uudelleen.",
  byArrangement: "Sopimuksen mukaan",
  previewTitle: "Esikatselu – ei vielä lähetetty",
  previewText: "Tämä tarjous on vielä luonnos. Asiakas näkee sen tällaisena. Maksaminen on mahdollista vasta, kun olette lähettäneet sen tai kopioineet linkin.",
};

export default offer;

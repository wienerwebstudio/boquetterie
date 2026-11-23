import type { PartialMessages } from "@/i18n/messages";

/** sl – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Vaša ponudba",
  eyebrow: "Osebna ponudba {id}",
  title: "Vaša osebna ponudba",
  intro: "Pozdravljeni, {name}, tukaj je vaša ponudba. V miru preverite vse in varno plačajte na spletu.",
  items: "Vaše cvetje",
  delivery: "Dostava",
  date: "Termin",
  place: "Kraj dostave",
  recipient: "Prejemnik",
  card: "Voščilnica",
  flowers: "Cvetje",
  extras: "Dodatki",
  deliveryFee: "Dostava",
  free: "brezplačno",
  validUntil: "Velja do {date}",
  payTitle: "Plačilo",
  pay: "Plačajte zdaj · {total}",
  acceptTerms: "Prebral(-a) sem: {terms} in {withdrawal}.",
  acceptTermsError: "Potrdite splošne pogoje.",
  paidTitle: "Hvala – že plačano",
  paidText: "Ta ponudba je plačana. Potrditev naročila ste prejeli po e-pošti.",
  viewOrder: "Oglejte si naročilo",
  expiredTitle: "Ponudba je potekla",
  expiredText: "Ta ponudba ni več veljavna. Kar pišite nam – pripravimo vam novo.",
  cancelledTitle: "Ponudba ni več na voljo",
  cancelledText: "Ta ponudba je bila umaknjena. Če imate vprašanja, nam kar pišite.",
  cancelledPayment: "Plačilo ni bilo zaključeno. Lahko poskusite znova.",
  failed: "Plačila ni bilo mogoče začeti. Poskusite znova.",
  byArrangement: "Po dogovoru",
  previewTitle: "Predogled – še ni poslano",
  previewText: "Ta ponudba je še osnutek. Tako jo vidi stranka. Plačilo je mogoče šele, ko jo pošljete ali kopirate povezavo.",
};

export default offer;

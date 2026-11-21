import type { PartialMessages } from "@/i18n/messages";

/** it – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "La tua offerta",
  eyebrow: "Offerta personale {id}",
  title: "La tua offerta personale",
  intro: "Ciao {name}, ecco la tua offerta. Controlla tutto con calma e paga in modo sicuro online.",
  items: "I tuoi fiori",
  delivery: "Consegna",
  date: "Data e ora",
  place: "Luogo di consegna",
  recipient: "Destinatario",
  card: "Biglietto d'auguri",
  flowers: "Fiori",
  extras: "Extra",
  deliveryFee: "Consegna",
  free: "gratuita",
  validUntil: "Valida fino al {date}",
  payTitle: "Pagamento",
  pay: "Paga ora · {total}",
  acceptTerms: "Ho letto le {terms} e l'{withdrawal}.",
  acceptTermsError: "Conferma le condizioni generali.",
  paidTitle: "Grazie – già pagata",
  paidText: "Questa offerta è stata pagata. Hai ricevuto la conferma d'ordine via e-mail.",
  viewOrder: "Vedi l'ordine",
  expiredTitle: "Offerta scaduta",
  expiredText: "Questa offerta non è più valida. Scrivici: ne prepariamo volentieri una nuova.",
  cancelledTitle: "Offerta non più disponibile",
  cancelledText: "Questa offerta è stata ritirata. Per domande scrivici.",
  cancelledPayment: "Il pagamento non è stato completato. Puoi riprovare.",
  failed: "Non è stato possibile avviare il pagamento. Riprova.",
  byArrangement: "Come concordato",
  previewTitle: "Anteprima – non ancora inviata",
  previewText: "Questa offerta è ancora una bozza. Così la vedrà il cliente. Il pagamento è possibile solo dopo l’invio o la copia del link.",
};

export default offer;

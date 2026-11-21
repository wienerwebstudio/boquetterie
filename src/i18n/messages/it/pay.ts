import type { PartialMessages } from "@/i18n/messages";

/** it – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Caricamento del campo di pagamento …",
    loadFailed: "Non è stato possibile caricare il campo di pagamento. Ricarica la pagina, prova un altro browser o scegli un altro metodo di pagamento. Non è stato addebitato nulla.",
    redirectHint: "Dopo “Acquista ora” confermi il pagamento con {method}.",
    walletHint: "Dopo “Acquista ora” confermi il pagamento con {method}.",
    amountChanged: "Il totale ora è {total} (ad es. per la consegna o un buono). Controllalo e tocca di nuovo il pulsante – non è stato addebitato nulla.",
    failed: "Il pagamento non è andato a buon fine: {reason} Il tuo ordine {orderId} è salvato ma non ancora pagato – riprova subito o scegli un altro metodo di pagamento.",
    retry: "Inserisci di nuovo i dati di pagamento e tocca ancora il pulsante.",
  },
  express: {
    title: "Acquisto express",
    /** Divider between the checkout button and the wallet buttons in the cart. */
    intro: "Ordina subito con Apple Pay, Google Pay o Link – indirizzo di consegna e dati di contatto arrivano dal tuo wallet.",
    postalCode: "CAP del destinatario",
    date: "Giorno di consegna",
    window: "Fascia oraria",
    choose: "Scegli",
    needPostalCode: "Inserisci prima il CAP del destinatario.",
    needSlot: "Scegli prima giorno di consegna e fascia oraria.",
    noDays: "Per questo CAP al momento non c’è nessun giorno di consegna libero.",
    errors: {
      zone: "Purtroppo non consegniamo a questo CAP. Scegli un indirizzo nella nostra zona di consegna.",
      date: "Il giorno di consegna scelto non è disponibile per questo indirizzo. Scegli un altro giorno.",
      window: "La fascia oraria scelta non è disponibile per questo indirizzo. Scegline un’altra.",
      minOrder: "Per questa zona di consegna vale un importo minimo d’ordine – vai al checkout.",
      items: "Un articolo al momento non è disponibile. Controlla il carrello.",
      coupon: "Il buono non è valido. Rimuovilo o vai al checkout.",
      address: "Scegli nel tuo wallet un indirizzo di consegna completo con numero civico, un indirizzo e-mail e un numero di telefono.",
      amountChanged: "L’importo è appena cambiato. Avvia di nuovo l’acquisto express – non è stato addebitato nulla.",
      failed: "Il pagamento express non è andato a buon fine. Non è stato addebitato nulla – riprova o vai al checkout.",
      connection: "Nessuna connessione. Controlla la tua connessione internet e riprova.",
    },
    goods: "Fiori ed extra",
    shipping: "Consegna il {date}",
    shippingWindow: "Consegna il {date}, {window}",
    legal: "Con {wallet} effettui un ordine con obbligo di pagamento · {terms} · {withdrawal}",
    terms: "Condizioni",
    withdrawal: "Recesso",
    withdrawalNote: "Per i fiori recisi freschi non sussiste il diritto di recesso.",
  },
};

export default pay;

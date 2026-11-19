import type { PartialMessages } from "@/i18n/messages";

/** it – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Bouquet da {price}",
    allOfVienna: "Consegna in tutta Vienna",
    greetingCardIncluded: "Biglietto d'auguri incluso",
  },
  trustBarLabel: "Le nostre promesse",
  bestsellers: {
    eyebrow: "Assortimento",
    allLink: "Tutti i fiori",
  },
  occasions: {
    eyebrow: "Acquista per occasione",
    allLink: "Tutte le occasioni",
  },
  giftFinder: {
    eyebrow: "Trova il regalo",
    title: "Oggi hai pensato a qualcuno?",
    text: "Tre brevi domande – e ti mostriamo i bouquet giusti.",
    stepsLabel: "Le tre domande",
    stepRecipient: "Per chi?",
    stepOccasion: "Occasione",
    stepBudget: "Budget",
    cta: "Trova il regalo",
  },
  collections: {
    eyebrow: "Collezioni",
  },
  seasonal: {
    pricePending: "Prezzo in arrivo",
    from: "da",
  },
  howItWorks: {
    eyebrow: "Come funziona",
  },
  extras: {
    eyebrow: "Extra",
    allLink: "Tutti gli extra",
    note: "Gli extra si aggiungono a un bouquet – nella pagina del prodotto o nel carrello.",
  },
  gallery: {
    eyebrow: "Galleria",
  },
  subscriptionTeaser: {
    eyebrow: "Abbonamento fiori",
    from: "Da",
    perDelivery: "a consegna",
    rhythm: "Frequenza",
    imageAlt: "Bouquet di stagione del nostro abbonamento fiori",
  },
  reviews: {
    eyebrow: "Dicono di noi",
    listLabel: "Recensioni",
    quote: "«{text}»",
    verifiedPurchase: "Acquisto verificato",
    demoNote: "Recensioni di esempio – presto arriveranno quelle vere.",
  },
  faq: {
    eyebrow: "FAQ",
    text: "Risposte alle domande più frequenti su consegna, ordini e fiori.",
    allLink: "Tutte le domande e risposte",
  },
  newsletter: {
    eyebrow: "Newsletter",
  },

  subscription: {
    title: "Abbonamento fiori",
    metaTitle: "Abbonamento fiori – {headline}",
    unavailable: "L'abbonamento fiori al momento non è disponibile.",
    unavailableText: "Ci stiamo lavorando. Nel frattempo trovi bouquet freschi per ogni occasione nello shop.",
    discoverFlowers: "Scopri i fiori",
    contact: "Contatti",
    audiencesLabel: "Per chi",
    choosePlan: "Scegli l'abbonamento",
    imageAlt: "Bouquet di stagione dell'abbonamento fiori",
    plansEyebrow: "Formati dell'abbonamento",
    plansTitle: "Quale abbonamento fa per te?",
    plansText: "I prezzi si intendono per consegna, consegna nella nostra area di servizio inclusa. Sconti in base alla frequenza.",
    howEyebrow: "Come funziona",
    howTitle: "Tre passi fino al primo bouquet.",
    steps: {
      plan: { title: "Scegli l'abbonamento", text: "Small, Medium o Large – a seconda di quanto spazio vuoi dare ai fiori." },
      rhythm: { title: "Imposta la frequenza", text: "Ogni settimana, ogni due settimane o una volta al mese. Puoi mettere in pausa in qualsiasi momento." },
      request: { title: "Invia la richiesta", text: "Ti ricontattiamo con tutti i dettagli e concordiamo con te luogo di consegna e data di inizio." },
    },
  },

  planner: {
    checkoutError: "Al momento non è possibile sottoscrivere l'abbonamento. Riprova più tardi.",
    nameRequired: "Inserisci il tuo nome.",
    chooseRhythm: "Scegli la frequenza",
    rhythmLabel: "Frequenza di consegna",
    popular: "Il più scelto",
    perDelivery: "/ consegna",
    discount: "{discount}% di sconto",
    selected: "Selezionato",
    choosePlan: "Scegli {name}",
    requestPlan: "Richiedi {name}",
    checkoutDoneTitle: "Grazie – il tuo abbonamento fiori è attivo.",
    checkoutDoneText: "Riceverai una conferma via e-mail. Ti contatteremo per concordare con te luogo di consegna e data di inizio.",
    checkout: "Sottoscrivi l'abbonamento",
    requestInstead: "Preferisco una richiesta senza impegno",
    selectionSummary: "{plan}, {frequency} – {price} a consegna.",
    securePayment: "Pagamento sicuro con Stripe, disdicibile in qualsiasi momento.",
    sendRequest: "Invia la richiesta",
    noObligation: "Senza impegno – ti ricontattiamo con tutti i dettagli.",
    thanksTitle: "Grazie per la tua richiesta.",
    thanksText: "Abbiamo ricevuto la tua richiesta per l'abbonamento {plan} ({frequency}) e ti risponderemo via e-mail.",
    formEyebrow: "Richiesta",
    formTitle: "Raccontaci in breve cosa desideri.",
    formText: "Nessun contratto, nessun pagamento – ti ricontattiamo con tutti i dettagli e una proposta concreta.",
    plan: "Abbonamento",
    rhythm: "Frequenza",
    messagePlaceholder: "Dove devono arrivare i fiori? Hai preferenze di colore o un giorno preferito?",
    currentSelection: "Selezione attuale: {plan}, {frequency} – {price} a consegna",
  },
};

export default home;

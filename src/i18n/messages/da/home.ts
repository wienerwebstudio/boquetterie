import type { PartialMessages } from "@/i18n/messages";

/** da – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Buketter fra {price}",
    allOfVienna: "Levering i hele Wien",
    greetingCardIncluded: "Hilsenkort inkluderet",
  },
  trustBarLabel: "Vores løfter",
  bestsellers: {
    eyebrow: "Sortiment",
    allLink: "Alle blomster",
  },
  occasions: {
    eyebrow: "Shop efter anledning",
    allLink: "Alle anledninger",
  },
  giftFinder: {
    eyebrow: "Gavefinder",
    title: "Har du tænkt på nogen i dag?",
    text: "Tre korte spørgsmål – så viser vi dig buketter, der passer.",
    stepsLabel: "De tre spørgsmål",
    stepRecipient: "Til hvem?",
    stepOccasion: "Anledning",
    stepBudget: "Budget",
    cta: "Find en gave",
  },
  collections: {
    eyebrow: "Kollektioner",
  },
  seasonal: {
    pricePending: "Pris følger",
    from: "fra",
  },
  howItWorks: {
    eyebrow: "Sådan fungerer det",
  },
  extras: {
    eyebrow: "Ekstra",
    allLink: "Alt ekstra",
    note: "Ekstra tilføjes til en buket – på produktsiden eller i kurven.",
  },
  gallery: {
    eyebrow: "Galleri",
  },
  subscriptionTeaser: {
    eyebrow: "Blomsterabonnement",
    from: "Fra",
    perDelivery: "pr. levering",
    rhythm: "Interval",
    imageAlt: "Sæsonbuket fra vores blomsterabonnement",
  },
  reviews: {
    eyebrow: "Kundeanmeldelser",
    listLabel: "Anmeldelser",
    quote: "„{text}“",
    verifiedPurchase: "Verificeret køb",
    previous: "Forrige anmeldelser",
    next: "Næste anmeldelser",
    textLabel: "Anmeldelse fra {name}",
    demoNote: "Eksempler på anmeldelser – ægte anmeldelser følger.",
  },
  faq: {
    eyebrow: "FAQ",
    text: "Svar på de mest almindelige spørgsmål om levering, bestilling og blomster.",
    allLink: "Alle spørgsmål og svar",
  },
  newsletter: {
    eyebrow: "Nyhedsbrev",
  },

  subscription: {
    title: "Blomsterabonnement",
    metaTitle: "Blomsterabonnement – {headline}",
    unavailable: "Blomsterabonnementet er ikke tilgængeligt i øjeblikket.",
    unavailableText: "Vi arbejder på det. Indtil da finder du friske buketter til enhver anledning i shoppen.",
    discoverFlowers: "Se blomster",
    contact: "Kontakt",
    audiencesLabel: "Til hvem",
    choosePlan: "Vælg abonnement",
    imageAlt: "Sæsonbuket fra blomsterabonnementet",
    plansEyebrow: "Abonnementsstørrelser",
    plansTitle: "Hvilket abonnement passer til dig?",
    plansText: "Priserne gælder pr. levering inklusive levering i vores leveringsområde. Rabat afhængigt af interval.",
    howEyebrow: "Sådan fungerer det",
    howTitle: "Tre trin til den første buket.",
    steps: {
      plan: { title: "Vælg abonnement", text: "Small, Medium eller Large – alt efter hvor meget plads blomsterne skal have." },
      rhythm: { title: "Vælg interval", text: "Hver uge, hver anden uge eller hver måned. Du kan til enhver tid sætte på pause." },
      request: { title: "Send forespørgsel", text: "Vi vender tilbage med alle detaljer og aftaler leveringssted og startdato med dig." },
    },
  },

  planner: {
    checkoutError: "Det er ikke muligt at tegne abonnementet lige nu. Prøv venligst igen senere.",
    nameRequired: "Indtast venligst dit navn.",
    chooseRhythm: "Vælg interval",
    rhythmLabel: "Leveringsinterval",
    popular: "Populær",
    perDelivery: "/ levering",
    discount: "{discount}% rabat",
    selected: "Valgt",
    choosePlan: "Vælg {name}",
    requestPlan: "Forespørg {name}",
    checkoutDoneTitle: "Tak – dit blomsterabonnement er oprettet.",
    checkoutDoneText: "Du får en bekræftelse på e-mail. Vi kontakter dig for at aftale leveringssted og startdato.",
    checkout: "Tegn abonnement",
    requestInstead: "Hellere en uforpligtende forespørgsel",
    selectionSummary: "{plan}, {frequency} – {price} pr. levering.",
    securePayment: "Sikker betaling via Stripe, kan opsiges når som helst.",
    sendRequest: "Send forespørgsel",
    noObligation: "Uforpligtende – vi vender tilbage med alle detaljer.",
    thanksTitle: "Tak for din forespørgsel.",
    thanksText: "Vi har modtaget din forespørgsel om abonnementet {plan} ({frequency}) og kontakter dig på e-mail.",
    formEyebrow: "Forespørgsel",
    formTitle: "Fortæl os kort, hvad du ønsker dig.",
    formText: "Ingen kontrakt, ingen betaling – vi vender tilbage med alle detaljer og et konkret forslag.",
    plan: "Abonnement",
    rhythm: "Interval",
    messagePlaceholder: "Hvor skal blomsterne hen? Har du farveønsker eller en ønskedag?",
    currentSelection: "Aktuelt valg: {plan}, {frequency} – {price} pr. levering",
  },
};

export default home;

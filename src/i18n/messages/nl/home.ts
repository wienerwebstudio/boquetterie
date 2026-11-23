import type { PartialMessages } from "@/i18n/messages";

/** nl – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Boeketten vanaf {price}",
    allOfVienna: "Bezorging in heel Wenen",
    greetingCardIncluded: "Kaartje inbegrepen",
  },
  trustBarLabel: "Onze beloften",
  bestsellers: {
    eyebrow: "Assortiment",
    allLink: "Alle bloemen",
  },
  occasions: {
    eyebrow: "Shoppen per gelegenheid",
    allLink: "Alle gelegenheden",
  },
  giftFinder: {
    eyebrow: "Cadeauzoeker",
    title: "Vandaag aan iemand gedacht?",
    text: "Drie korte vragen – en we laten je boeketten zien die passen.",
    stepsLabel: "De drie vragen",
    stepRecipient: "Voor wie?",
    stepOccasion: "Gelegenheid",
    stepBudget: "Budget",
    cta: "Cadeau vinden",
  },
  collections: {
    eyebrow: "Collecties",
  },
  seasonal: {
    pricePending: "Prijs volgt",
    from: "vanaf",
  },
  howItWorks: {
    eyebrow: "Zo werkt het",
  },
  extras: {
    eyebrow: "Extra's",
    allLink: "Alle extra's",
    note: "Extra's voeg je toe aan een boeket – op de productpagina of in het winkelmandje.",
  },
  gallery: {
    eyebrow: "Galerij",
  },
  subscriptionTeaser: {
    eyebrow: "Bloemenabonnement",
    from: "Vanaf",
    perDelivery: "per bezorging",
    rhythm: "Frequentie",
    imageAlt: "Seizoensboeket uit ons bloemenabonnement",
  },
  reviews: {
    eyebrow: "Wat klanten zeggen",
    listLabel: "Beoordelingen",
    quote: "„{text}”",
    verifiedPurchase: "Geverifieerde aankoop",
    previous: "Vorige beoordelingen",
    next: "Volgende beoordelingen",
    textLabel: "Beoordeling van {name}",
    demoNote: "Voorbeeldbeoordelingen – echte beoordelingen volgen.",
  },
  faq: {
    eyebrow: "FAQ",
    text: "Antwoorden op de meest gestelde vragen over bezorging, bestellen en bloemen.",
    allLink: "Alle vragen & antwoorden",
  },
  newsletter: {
    eyebrow: "Nieuwsbrief",
  },

  subscription: {
    title: "Bloemenabonnement",
    metaTitle: "Bloemenabonnement – {headline}",
    unavailable: "Het bloemenabonnement is op dit moment niet beschikbaar.",
    unavailableText: "We werken eraan. Tot die tijd vind je in de shop verse boeketten voor elke gelegenheid.",
    discoverFlowers: "Bloemen ontdekken",
    contact: "Contact",
    audiencesLabel: "Voor wie",
    choosePlan: "Abonnement kiezen",
    imageAlt: "Seizoensboeket uit het bloemenabonnement",
    plansEyebrow: "Abonnementsgroottes",
    plansTitle: "Welk abonnement past bij jou?",
    plansText: "Prijzen gelden per bezorging, inclusief bezorging in ons bezorggebied. Korting afhankelijk van de frequentie.",
    howEyebrow: "Hoe het werkt",
    howTitle: "In drie stappen naar je eerste boeket.",
    steps: {
      plan: { title: "Abonnement kiezen", text: "Small, Medium of Large – afhankelijk van hoeveel ruimte de bloemen mogen krijgen." },
      rhythm: { title: "Frequentie bepalen", text: "Wekelijks, om de twee weken of maandelijks. Pauzeren kan altijd." },
      request: { title: "Aanvraag versturen", text: "We nemen contact met je op met alle details en stemmen bezorgadres en startdatum met je af." },
    },
  },

  planner: {
    checkoutError: "Het abonnement afsluiten is op dit moment niet mogelijk. Probeer het later nog een keer.",
    nameRequired: "Vul je naam in.",
    chooseRhythm: "Frequentie kiezen",
    rhythmLabel: "Bezorgfrequentie",
    popular: "Populair",
    perDelivery: "/ bezorging",
    discount: "{discount}% korting",
    selected: "Gekozen",
    choosePlan: "{name} kiezen",
    requestPlan: "{name} aanvragen",
    checkoutDoneTitle: "Bedankt – je bloemenabonnement is afgesloten.",
    checkoutDoneText: "Je ontvangt een bevestiging per e-mail. We nemen contact met je op om bezorgadres en startdatum af te stemmen.",
    checkout: "Abonnement afsluiten",
    requestInstead: "Liever vrijblijvend aanvragen",
    selectionSummary: "{plan}, {frequency} – {price} per bezorging.",
    securePayment: "Veilig betalen via Stripe, altijd opzegbaar.",
    sendRequest: "Aanvraag versturen",
    noObligation: "Vrijblijvend – we nemen contact met je op met alle details.",
    thanksTitle: "Bedankt voor je aanvraag.",
    thanksText: "We hebben je aanvraag voor het abonnement {plan} ({frequency}) ontvangen en nemen per e-mail contact met je op.",
    formEyebrow: "Aanvraag",
    formTitle: "Vertel ons kort wat je wilt.",
    formText: "Geen contract, geen betaling – we nemen contact met je op met alle details en een concreet voorstel.",
    plan: "Abonnement",
    rhythm: "Frequentie",
    messagePlaceholder: "Waar moeten de bloemen naartoe? Heb je kleurwensen of een voorkeursdag?",
    currentSelection: "Huidige keuze: {plan}, {frequency} – {price} per bezorging",
  },
};

export default home;

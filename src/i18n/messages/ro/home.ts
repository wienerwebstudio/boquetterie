import type { PartialMessages } from "@/i18n/messages";

/** ro – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Buchete de la {price}",
    allOfVienna: "Livrare în toată Viena",
    greetingCardIncluded: "Felicitare inclusă",
  },
  trustBarLabel: "Promisiunile noastre",
  bestsellers: {
    eyebrow: "Ofertă",
    allLink: "Toate florile",
  },
  occasions: {
    eyebrow: "Cumpără după ocazie",
    allLink: "Toate ocaziile",
  },
  giftFinder: {
    eyebrow: "Găsește cadoul",
    title: "Te-ai gândit azi la cineva?",
    text: "Trei întrebări scurte – și îți arătăm buchetele potrivite.",
    stepsLabel: "Cele trei întrebări",
    stepRecipient: "Pentru cine?",
    stepOccasion: "Ocazie",
    stepBudget: "Buget",
    cta: "Găsește cadoul",
  },
  collections: {
    eyebrow: "Colecții",
  },
  seasonal: {
    pricePending: "Prețul urmează",
    from: "de la",
  },
  howItWorks: {
    eyebrow: "Cum funcționează",
  },
  extras: {
    eyebrow: "Extra",
    allLink: "Toate produsele extra",
    note: "Produsele extra se adaugă la un buchet – pe pagina produsului sau în coș.",
  },
  gallery: {
    eyebrow: "Galerie",
  },
  subscriptionTeaser: {
    eyebrow: "Abonament de flori",
    from: "De la",
    perDelivery: "per livrare",
    rhythm: "Frecvență",
    imageAlt: "Buchet de sezon din abonamentul nostru de flori",
  },
  reviews: {
    eyebrow: "Păreri ale clienților",
    listLabel: "Recenzii",
    quote: "„{text}”",
    verifiedPurchase: "Cumpărare verificată",
    demoNote: "Recenzii de exemplu – urmează recenzii reale.",
  },
  faq: {
    eyebrow: "Întrebări frecvente",
    text: "Răspunsuri la cele mai frecvente întrebări despre livrare, comandă și flori.",
    allLink: "Toate întrebările și răspunsurile",
  },
  newsletter: {
    eyebrow: "Newsletter",
  },

  subscription: {
    title: "Abonament de flori",
    metaTitle: "Abonament de flori – {headline}",
    unavailable: "Abonamentul de flori nu este disponibil momentan.",
    unavailableText: "Lucrăm la asta. Până atunci, găsești în magazin buchete proaspete pentru orice ocazie.",
    discoverFlowers: "Descoperă florile",
    contact: "Contact",
    audiencesLabel: "Pentru cine",
    choosePlan: "Alege abonamentul",
    imageAlt: "Buchet de sezon din abonamentul de flori",
    plansEyebrow: "Mărimi de abonament",
    plansTitle: "Ce abonament ți se potrivește?",
    plansText: "Prețurile sunt per livrare, cu livrarea inclusă în zona noastră de livrare. Reduceri în funcție de frecvență.",
    howEyebrow: "Cum funcționează",
    howTitle: "Trei pași până la primul buchet.",
    steps: {
      plan: { title: "Alege abonamentul", text: "Small, Medium sau Large – în funcție de cât spațiu vrei să le dai florilor." },
      rhythm: { title: "Stabilește frecvența", text: "Săptămânal, la două săptămâni sau lunar. Poți face oricând o pauză." },
      request: { title: "Trimite cererea", text: "Revenim cu toate detaliile și stabilim împreună cu tine locul de livrare și data de început." },
    },
  },

  planner: {
    checkoutError: "Încheierea abonamentului nu este posibilă momentan. Te rugăm să încerci din nou mai târziu.",
    nameRequired: "Te rugăm să introduci numele tău.",
    chooseRhythm: "Alege frecvența",
    rhythmLabel: "Frecvența livrării",
    popular: "Popular",
    perDelivery: "/ livrare",
    discount: "{discount}% reducere",
    selected: "Selectat",
    choosePlan: "Alege {name}",
    requestPlan: "Solicită {name}",
    checkoutDoneTitle: "Mulțumim – abonamentul tău de flori este activat.",
    checkoutDoneText: "Primești o confirmare pe e-mail. Te contactăm ca să stabilim împreună locul de livrare și data de început.",
    checkout: "Încheie abonamentul",
    requestInstead: "Mai bine o cerere fără obligații",
    selectionSummary: "{plan}, {frequency} – {price} per livrare.",
    securePayment: "Plată sigură prin Stripe, poți anula oricând.",
    sendRequest: "Trimite cererea",
    noObligation: "Fără obligații – revenim cu toate detaliile.",
    thanksTitle: "Mulțumim pentru cerere.",
    thanksText: "Am primit cererea ta pentru abonamentul {plan} ({frequency}) și te contactăm pe e-mail.",
    formEyebrow: "Cerere",
    formTitle: "Spune-ne pe scurt ce îți dorești.",
    formText: "Fără contract, fără plată – revenim cu toate detaliile și o propunere concretă.",
    plan: "Abonament",
    rhythm: "Frecvență",
    messagePlaceholder: "Unde să ajungă florile? Ai preferințe de culori sau o zi anume?",
    currentSelection: "Selecția actuală: {plan}, {frequency} – {price} per livrare",
  },
};

export default home;

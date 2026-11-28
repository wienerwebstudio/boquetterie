import type { PartialMessages } from "@/i18n/messages";

/** sv – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Buketter från {price}",
    allOfVienna: "Leverans i hela Wien",
    greetingCardIncluded: "Hälsningskort ingår",
  },
  trustBarLabel: "Våra löften",
  bestsellers: {
    eyebrow: "Sortiment",
    allLink: "Alla blommor",
  },
  occasions: {
    eyebrow: "Handla efter tillfälle",
    allLink: "Alla tillfällen",
  },
  giftFinder: {
    eyebrow: "Presenthittare",
    title: "Tänkt på någon i dag?",
    text: "Tre korta frågor – så visar vi dig buketter som passar.",
    stepsLabel: "De tre frågorna",
    stepRecipient: "Till vem?",
    stepOccasion: "Tillfälle",
    stepBudget: "Budget",
    cta: "Hitta en present",
  },
  collections: {
    eyebrow: "Kollektioner",
  },
  seasonal: {
    pricePending: "Pris kommer",
    from: "från",
  },
  howItWorks: {
    eyebrow: "Så fungerar det",
  },
  extras: {
    eyebrow: "Tillbehör",
    allLink: "Alla tillbehör",
    note: "Tillbehör läggs till en bukett – på produktsidan eller i varukorgen.",
  },
  gallery: {
    eyebrow: "Galleri",
  },
  subscriptionTeaser: {
    eyebrow: "Blomsterprenumeration",
    from: "Från",
    perDelivery: "per leverans",
    rhythm: "Intervall",
    imageAlt: "Säsongsbukett från vår blomsterprenumeration",
  },
  reviews: {
    eyebrow: "Kundröster",
    listLabel: "Omdömen",
    quote: "”{text}”",
    verifiedPurchase: "Verifierat köp",
    previous: "Föregående omdömen",
    next: "Nästa omdömen",
    textLabel: "Omdöme från {name}",
    demoNote: "Exempelomdömen – riktiga omdömen kommer.",
  },
  faq: {
    eyebrow: "Vanliga frågor",
    text: "Svar på de vanligaste frågorna om leverans, beställning och blommor.",
    allLink: "Alla frågor & svar",
  },
  newsletter: {
    eyebrow: "Nyhetsbrev",
  },

  subscription: {
    title: "Blomsterprenumeration",
    metaTitle: "Blomsterprenumeration – {headline}",
    unavailable: "Blomsterprenumerationen är inte tillgänglig för närvarande.",
    unavailableText: "Vi arbetar på det. Till dess hittar du färska buketter för alla tillfällen i butiken.",
    discoverFlowers: "Upptäck blommor",
    contact: "Kontakt",
    audiencesLabel: "Till vem",
    choosePlan: "Välj prenumeration",
    imageAlt: "Säsongsbukett från blomsterprenumerationen",
    plansEyebrow: "Prenumerationsstorlekar",
    plansTitle: "Vilken prenumeration passar dig?",
    plansText: "Priserna gäller per leverans, inklusive leverans inom vårt leveransområde. Rabatt beroende på intervall.",
    howEyebrow: "Så fungerar det",
    howTitle: "Tre steg till den första buketten.",
    steps: {
      plan: { title: "Välj prenumeration", text: "Small, Medium eller Large – beroende på hur mycket plats blommorna ska få." },
      rhythm: { title: "Bestäm intervall", text: "Varje vecka, varannan vecka eller varje månad. Du kan pausa när som helst." },
      request: { title: "Skicka förfrågan", text: "Vi hör av oss med alla detaljer och kommer överens med dig om leveransplats och startdatum." },
    },
  },

  planner: {
    checkoutError: "Det går inte att teckna prenumerationen just nu. Försök igen senare.",
    nameRequired: "Ange ditt namn.",
    chooseRhythm: "Välj intervall",
    rhythmLabel: "Leveransintervall",
    popular: "Populär",
    perDelivery: "/ leverans",
    discount: "{discount} % rabatt",
    selected: "Vald",
    choosePlan: "Välj {name}",
    requestPlan: "Fråga om {name}",
    checkoutDoneTitle: "Tack – din blomsterprenumeration är tecknad.",
    checkoutDoneText: "Du får en bekräftelse via e-post. Vi hör av oss för att komma överens med dig om leveransplats och startdatum.",
    checkout: "Teckna prenumeration",
    requestInstead: "Skicka hellre en förfrågan utan förpliktelse",
    selectionSummary: "{plan}, {frequency} – {price} per leverans.",
    securePayment: "Säker betalning via Stripe, kan sägas upp när som helst.",
    sendRequest: "Skicka förfrågan",
    noObligation: "Utan förpliktelse – vi hör av oss med alla detaljer.",
    thanksTitle: "Tack för din förfrågan.",
    thanksText: "Vi har tagit emot din förfrågan om prenumerationen {plan} ({frequency}) och hör av oss till dig via e-post.",
    formEyebrow: "Förfrågan",
    formTitle: "Berätta kort vad du önskar.",
    formText: "Inget avtal, ingen betalning – vi hör av oss med alla detaljer och ett konkret förslag.",
    plan: "Prenumeration",
    rhythm: "Intervall",
    messagePlaceholder: "Vart ska blommorna? Har du önskemål om färger eller en önskad dag?",
    currentSelection: "Aktuellt val: {plan}, {frequency} – {price} per leverans",
  },
};

export default home;

import type { PartialMessages } from "@/i18n/messages";

/** sk – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Kytice od {price}",
    allOfVienna: "Doručenie po celej Viedni",
    greetingCardIncluded: "Pozdravná kartička v cene",
  },
  trustBarLabel: "Naše sľuby",
  bestsellers: {
    eyebrow: "Sortiment",
    allLink: "Všetky kvety",
  },
  occasions: {
    eyebrow: "Nákup podľa príležitosti",
    allLink: "Všetky príležitosti",
  },
  giftFinder: {
    eyebrow: "Vyhľadávač darčekov",
    title: "Mysleli ste dnes na niekoho?",
    text: "Tri krátke otázky – a ukážeme vám kytice, ktoré sa hodia.",
    stepsLabel: "Tri otázky",
    stepRecipient: "Pre koho?",
    stepOccasion: "Príležitosť",
    stepBudget: "Rozpočet",
    cta: "Nájsť darček",
  },
  collections: {
    eyebrow: "Kolekcie",
  },
  seasonal: {
    pricePending: "Cena bude doplnená",
    from: "od",
  },
  howItWorks: {
    eyebrow: "Ako to funguje",
  },
  extras: {
    eyebrow: "Doplnky",
    allLink: "Všetky doplnky",
    note: "Doplnky sa pridávajú ku kytici – na stránke produktu alebo v košíku.",
  },
  gallery: {
    eyebrow: "Galéria",
  },
  subscriptionTeaser: {
    eyebrow: "Predplatné kvetov",
    from: "Od",
    perDelivery: "za doručenie",
    rhythm: "Frekvencia",
    imageAlt: "Sezónna kytica z nášho predplatného kvetov",
  },
  reviews: {
    eyebrow: "Hlasy zákazníkov",
    listLabel: "Hodnotenia",
    quote: "„{text}“",
    verifiedPurchase: "Overený nákup",
    demoNote: "Ukážkové hodnotenia – skutočné hodnotenia doplníme.",
  },
  faq: {
    eyebrow: "Časté otázky",
    text: "Odpovede na najčastejšie otázky o doručení, objednávke a kvetoch.",
    allLink: "Všetky otázky a odpovede",
  },
  newsletter: {
    eyebrow: "Newsletter",
  },

  subscription: {
    title: "Predplatné kvetov",
    metaTitle: "Predplatné kvetov – {headline}",
    unavailable: "Predplatné kvetov momentálne nie je dostupné.",
    unavailableText: "Pracujeme na tom. Dovtedy nájdete v obchode čerstvé kytice na každú príležitosť.",
    discoverFlowers: "Objaviť kvety",
    contact: "Kontakt",
    audiencesLabel: "Pre koho",
    choosePlan: "Vybrať predplatné",
    imageAlt: "Sezónna kytica z predplatného kvetov",
    plansEyebrow: "Veľkosti predplatného",
    plansTitle: "Ktoré predplatné sa vám hodí?",
    plansText: "Ceny sú uvedené za jedno doručenie vrátane doručenia v našej oblasti doručenia. Zľavy podľa frekvencie.",
    howEyebrow: "Ako to funguje",
    howTitle: "Tri kroky k prvej kytici.",
    steps: {
      plan: { title: "Vyberte predplatné", text: "Small, Medium alebo Large – podľa toho, koľko priestoru majú kvety dostať." },
      rhythm: { title: "Určte frekvenciu", text: "Každý týždeň, každé dva týždne alebo raz za mesiac. Pozastaviť je možné kedykoľvek." },
      request: { title: "Pošlite dopyt", text: "Ozveme sa vám so všetkými podrobnosťami a dohodneme s vami miesto doručenia a dátum začiatku." },
    },
  },

  planner: {
    checkoutError: "Uzavretie predplatného momentálne nie je možné. Skúste to, prosím, neskôr.",
    nameRequired: "Zadajte, prosím, svoje meno.",
    chooseRhythm: "Vyberte frekvenciu",
    rhythmLabel: "Frekvencia doručenia",
    popular: "Obľúbené",
    perDelivery: "/ doručenie",
    discount: "Zľava {discount} %",
    selected: "Vybrané",
    choosePlan: "Vybrať {name}",
    requestPlan: "Dopyt na {name}",
    checkoutDoneTitle: "Ďakujeme – vaše predplatné kvetov je uzavreté.",
    checkoutDoneText: "Potvrdenie dostanete e-mailom. Ozveme sa vám, aby sme s vami dohodli miesto doručenia a dátum začiatku.",
    checkout: "Uzavrieť predplatné",
    requestInstead: "Radšej nezáväzný dopyt",
    selectionSummary: "{plan}, {frequency} – {price} za doručenie.",
    securePayment: "Bezpečná platba cez Stripe, kedykoľvek vypovedateľné.",
    sendRequest: "Poslať dopyt",
    noObligation: "Nezáväzne – ozveme sa vám so všetkými podrobnosťami.",
    thanksTitle: "Ďakujeme za váš dopyt.",
    thanksText: "Váš dopyt na predplatné {plan} ({frequency}) sme dostali a ozveme sa vám e-mailom.",
    formEyebrow: "Dopyt",
    formTitle: "Povedzte nám v krátkosti, čo si želáte.",
    formText: "Žiadna zmluva, žiadna platba – ozveme sa vám so všetkými podrobnosťami a konkrétnym návrhom.",
    plan: "Predplatné",
    rhythm: "Frekvencia",
    messagePlaceholder: "Kam majú kvety putovať? Máte želania ohľadom farieb alebo preferovaný deň?",
    currentSelection: "Aktuálny výber: {plan}, {frequency} – {price} za doručenie",
  },
};

export default home;

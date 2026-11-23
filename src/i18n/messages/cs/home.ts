import type { PartialMessages } from "@/i18n/messages";

/** cs – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Kytice od {price}",
    allOfVienna: "Doručení po celé Vídni",
    greetingCardIncluded: "Přání v ceně",
  },
  trustBarLabel: "Naše sliby",
  bestsellers: {
    eyebrow: "Sortiment",
    allLink: "Všechny květiny",
  },
  occasions: {
    eyebrow: "Nákup podle příležitosti",
    allLink: "Všechny příležitosti",
  },
  giftFinder: {
    eyebrow: "Vyhledávač dárků",
    title: "Myslíte dnes na někoho?",
    text: "Tři krátké otázky – a ukážeme vám kytice, které se hodí.",
    stepsLabel: "Tři otázky",
    stepRecipient: "Pro koho?",
    stepOccasion: "Příležitost",
    stepBudget: "Rozpočet",
    cta: "Najít dárek",
  },
  collections: {
    eyebrow: "Kolekce",
  },
  seasonal: {
    pricePending: "Cena bude doplněna",
    from: "od",
  },
  howItWorks: {
    eyebrow: "Jak to funguje",
  },
  extras: {
    eyebrow: "Doplňky",
    allLink: "Všechny doplňky",
    note: "Doplňky se přidávají ke kytici – na stránce produktu nebo v košíku.",
  },
  gallery: {
    eyebrow: "Galerie",
  },
  subscriptionTeaser: {
    eyebrow: "Předplatné květin",
    from: "Od",
    perDelivery: "za doručení",
    rhythm: "Frekvence",
    imageAlt: "Sezónní kytice z našeho předplatného květin",
  },
  reviews: {
    eyebrow: "Hodnocení zákazníků",
    listLabel: "Hodnocení",
    quote: "„{text}“",
    verifiedPurchase: "Ověřený nákup",
    previous: "Předchozí hodnocení",
    next: "Další hodnocení",
    textLabel: "Hodnocení od {name}",
    demoNote: "Ukázková hodnocení – skutečná hodnocení budou následovat.",
  },
  faq: {
    eyebrow: "Časté dotazy",
    text: "Odpovědi na nejčastější dotazy k doručení, objednávce a květinám.",
    allLink: "Všechny otázky a odpovědi",
  },
  newsletter: {
    eyebrow: "Newsletter",
  },

  subscription: {
    title: "Předplatné květin",
    metaTitle: "Předplatné květin – {headline}",
    unavailable: "Předplatné květin momentálně není k dispozici.",
    unavailableText: "Pracujeme na tom. Do té doby najdete v obchodě čerstvé kytice pro každou příležitost.",
    discoverFlowers: "Objevit květiny",
    contact: "Kontakt",
    audiencesLabel: "Pro koho",
    choosePlan: "Vybrat předplatné",
    imageAlt: "Sezónní kytice z předplatného květin",
    plansEyebrow: "Velikosti předplatného",
    plansTitle: "Které předplatné se k vám hodí?",
    plansText: "Ceny jsou uvedeny za jedno doručení včetně doručení v naší oblasti doručení. Slevy podle frekvence.",
    howEyebrow: "Jak to funguje",
    howTitle: "Tři kroky k první kytici.",
    steps: {
      plan: { title: "Vyberte předplatné", text: "Small, Medium nebo Large – podle toho, kolik prostoru mají květiny dostat." },
      rhythm: { title: "Nastavte frekvenci", text: "Každý týden, každé dva týdny nebo jednou měsíčně. Pozastavit lze kdykoli." },
      request: { title: "Odešlete poptávku", text: "Ozveme se vám se všemi podrobnostmi a domluvíme s vámi místo doručení a datum zahájení." },
    },
  },

  planner: {
    checkoutError: "Předplatné teď nelze sjednat. Zkuste to prosím později.",
    nameRequired: "Zadejte prosím své jméno.",
    chooseRhythm: "Vybrat frekvenci",
    rhythmLabel: "Frekvence doručení",
    popular: "Oblíbené",
    perDelivery: "/ doručení",
    discount: "Sleva {discount} %",
    selected: "Vybráno",
    choosePlan: "Vybrat {name}",
    requestPlan: "Poptat {name}",
    checkoutDoneTitle: "Děkujeme – vaše předplatné květin je sjednáno.",
    checkoutDoneText: "Potvrzení obdržíte e-mailem. Ozveme se vám, abychom domluvili místo doručení a datum zahájení.",
    checkout: "Sjednat předplatné",
    requestInstead: "Raději nezávazně poptat",
    selectionSummary: "{plan}, {frequency} – {price} za doručení.",
    securePayment: "Bezpečná platba přes Stripe, kdykoli vypověditelné.",
    sendRequest: "Odeslat poptávku",
    noObligation: "Nezávazně – ozveme se se všemi podrobnostmi.",
    thanksTitle: "Děkujeme za vaši poptávku.",
    thanksText: "Vaši poptávku předplatného {plan} ({frequency}) jsme obdrželi a ozveme se vám e-mailem.",
    formEyebrow: "Poptávka",
    formTitle: "Napište nám krátce, co si přejete.",
    formText: "Žádná smlouva, žádná platba – ozveme se se všemi podrobnostmi a konkrétním návrhem.",
    plan: "Předplatné",
    rhythm: "Frekvence",
    messagePlaceholder: "Kam mají květiny putovat? Máte přání ohledně barev nebo konkrétního dne?",
    currentSelection: "Aktuální výběr: {plan}, {frequency} – {price} za doručení",
  },
};

export default home;

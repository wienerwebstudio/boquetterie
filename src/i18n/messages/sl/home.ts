import type { PartialMessages } from "@/i18n/messages";

/** sl – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Šopki od {price}",
    allOfVienna: "Dostava po vsem Dunaju",
    greetingCardIncluded: "Voščilnica vključena",
  },
  trustBarLabel: "Naše obljube",
  bestsellers: {
    eyebrow: "Ponudba",
    allLink: "Vse cvetje",
  },
  occasions: {
    eyebrow: "Nakup po priložnosti",
    allLink: "Vse priložnosti",
  },
  giftFinder: {
    eyebrow: "Iskalnik daril",
    title: "Ste danes pomislili na nekoga?",
    text: "Tri kratka vprašanja – in pokažemo vam šopke, ki se ujemajo.",
    stepsLabel: "Tri vprašanja",
    stepRecipient: "Za koga?",
    stepOccasion: "Priložnost",
    stepBudget: "Proračun",
    cta: "Poiščite darilo",
  },
  collections: {
    eyebrow: "Kolekcije",
  },
  seasonal: {
    pricePending: "Cena sledi",
    from: "od",
  },
  howItWorks: {
    eyebrow: "Kako deluje",
  },
  extras: {
    eyebrow: "Dodatki",
    allLink: "Vsi dodatki",
    note: "Dodatke dodate k šopku – na strani izdelka ali v košarici.",
  },
  gallery: {
    eyebrow: "Galerija",
  },
  subscriptionTeaser: {
    eyebrow: "Naročnina na cvetje",
    from: "Od",
    perDelivery: "na dostavo",
    rhythm: "Ritem",
    imageAlt: "Sezonski šopek iz naše naročnine na cvetje",
  },
  reviews: {
    eyebrow: "Mnenja strank",
    listLabel: "Ocene",
    quote: "»{text}«",
    verifiedPurchase: "Preverjen nakup",
    previous: "Prejšnje ocene",
    next: "Naslednje ocene",
    textLabel: "Ocena stranke {name}",
    demoNote: "Primeri ocen – prave ocene sledijo.",
  },
  faq: {
    eyebrow: "Pogosta vprašanja",
    text: "Odgovori na najpogostejša vprašanja o dostavi, naročilu in cvetju.",
    allLink: "Vsa vprašanja in odgovori",
  },
  newsletter: {
    eyebrow: "E-novice",
  },

  subscription: {
    title: "Naročnina na cvetje",
    metaTitle: "Naročnina na cvetje – {headline}",
    unavailable: "Naročnina na cvetje trenutno ni na voljo.",
    unavailableText: "Delamo na tem. Do takrat v trgovini najdete sveže šopke za vsako priložnost.",
    discoverFlowers: "Odkrijte cvetje",
    contact: "Kontakt",
    audiencesLabel: "Za koga",
    choosePlan: "Izberite naročnino",
    imageAlt: "Sezonski šopek iz naročnine na cvetje",
    plansEyebrow: "Velikosti naročnine",
    plansTitle: "Katera naročnina vam ustreza?",
    plansText: "Cene veljajo na dostavo, vključno z dostavo na našem območju dostave. Popusti so odvisni od ritma.",
    howEyebrow: "Kako deluje",
    howTitle: "Trije koraki do prvega šopka.",
    steps: {
      plan: { title: "Izberite naročnino", text: "Small, Medium ali Large – odvisno od tega, koliko prostora naj dobi cvetje." },
      rhythm: { title: "Določite ritem", text: "Tedensko, vsaka dva tedna ali mesečno. Premor je mogoč kadar koli." },
      request: { title: "Pošljite povpraševanje", text: "Oglasili se bomo z vsemi podrobnostmi in se z vami dogovorili o kraju dostave in datumu začetka." },
    },
  },

  planner: {
    checkoutError: "Sklenitev naročnine trenutno ni mogoča. Poskusite znova pozneje.",
    nameRequired: "Vnesite svoje ime.",
    chooseRhythm: "Izberite ritem",
    rhythmLabel: "Ritem dostave",
    popular: "Priljubljeno",
    perDelivery: "/ dostava",
    discount: "{discount} % popusta",
    selected: "Izbrano",
    choosePlan: "Izberite {name}",
    requestPlan: "Povprašajte za {name}",
    checkoutDoneTitle: "Hvala – vaša naročnina na cvetje je sklenjena.",
    checkoutDoneText: "Po e-pošti boste prejeli potrditev. Oglasili se bomo, da se z vami dogovorimo o kraju dostave in datumu začetka.",
    checkout: "Sklenite naročnino",
    requestInstead: "Raje nezavezujoče povprašajte",
    selectionSummary: "{plan}, {frequency} – {price} na dostavo.",
    securePayment: "Varno plačilo prek Stripa, odpoved kadar koli.",
    sendRequest: "Pošljite povpraševanje",
    noObligation: "Nezavezujoče – oglasili se bomo z vsemi podrobnostmi.",
    thanksTitle: "Hvala za vaše povpraševanje.",
    thanksText: "Prejeli smo vaše povpraševanje za naročnino {plan} ({frequency}) in se vam bomo oglasili po e-pošti.",
    formEyebrow: "Povpraševanje",
    formTitle: "Na kratko nam povejte, kaj si želite.",
    formText: "Brez pogodbe, brez plačila – oglasili se bomo z vsemi podrobnostmi in konkretnim predlogom.",
    plan: "Naročnina",
    rhythm: "Ritem",
    messagePlaceholder: "Kam naj gre cvetje? Imate želje glede barv ali želeni dan?",
    currentSelection: "Trenutna izbira: {plan}, {frequency} – {price} na dostavo",
  },
};

export default home;

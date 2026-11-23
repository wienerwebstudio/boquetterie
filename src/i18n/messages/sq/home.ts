import type { PartialMessages } from "@/i18n/messages";

/** sq – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Buqeta nga {price}",
    allOfVienna: "Dërgesë në të gjithë Vjenën",
    greetingCardIncluded: "Kartolina e urimit e përfshirë",
  },
  trustBarLabel: "Premtimet tona",
  bestsellers: {
    eyebrow: "Oferta",
    allLink: "Të gjitha lulet",
  },
  occasions: {
    eyebrow: "Blini sipas rastit",
    allLink: "Të gjitha rastet",
  },
  giftFinder: {
    eyebrow: "Gjetësi i dhuratave",
    title: "Menduat sot për dikë?",
    text: "Tri pyetje të shkurtra – dhe ju tregojmë buqetat që përshtaten.",
    stepsLabel: "Tri pyetjet",
    stepRecipient: "Për kë?",
    stepOccasion: "Rasti",
    stepBudget: "Buxheti",
    cta: "Gjeni dhuratën",
  },
  collections: {
    eyebrow: "Koleksione",
  },
  seasonal: {
    pricePending: "Çmimi së shpejti",
    from: "nga",
  },
  howItWorks: {
    eyebrow: "Si funksionon",
  },
  extras: {
    eyebrow: "Shtesa",
    allLink: "Të gjitha shtesat",
    note: "Shtesat i shtohen një buqete – në faqen e produktit ose në shportë.",
  },
  gallery: {
    eyebrow: "Galeria",
  },
  subscriptionTeaser: {
    eyebrow: "Abonim lulesh",
    from: "Nga",
    perDelivery: "për dërgesë",
    rhythm: "Ritmi",
    imageAlt: "Buqetë stinore nga abonimi ynë i luleve",
  },
  reviews: {
    eyebrow: "Mendimet e klientëve",
    listLabel: "Vlerësime",
    quote: "„{text}“",
    verifiedPurchase: "Blerje e verifikuar",
    previous: "Vlerësimet e mëparshme",
    next: "Vlerësimet e radhës",
    textLabel: "Vlerësim nga {name}",
    demoNote: "Vlerësime shembull – vlerësimet e vërteta vijnë së shpejti.",
  },
  faq: {
    eyebrow: "Pyetje të shpeshta",
    text: "Përgjigje për pyetjet më të shpeshta rreth dërgesës, porosisë dhe luleve.",
    allLink: "Të gjitha pyetjet dhe përgjigjet",
  },
  newsletter: {
    eyebrow: "Buletini",
  },

  subscription: {
    title: "Abonim lulesh",
    metaTitle: "Abonim lulesh – {headline}",
    unavailable: "Abonimi i luleve nuk është i disponueshëm për momentin.",
    unavailableText: "Po punojmë për këtë. Deri atëherë gjeni buqeta të freskëta për çdo rast në dyqan.",
    discoverFlowers: "Zbuloni lulet",
    contact: "Kontakti",
    audiencesLabel: "Për kë",
    choosePlan: "Zgjidhni abonimin",
    imageAlt: "Buqetë stinore nga abonimi i luleve",
    plansEyebrow: "Madhësitë e abonimit",
    plansTitle: "Cili abonim ju përshtatet?",
    plansText: "Çmimet janë për çdo dërgesë, përfshirë dërgesën brenda zonës sonë të dërgesave. Zbritje sipas ritmit.",
    howEyebrow: "Si funksionon",
    howTitle: "Tre hapa deri te buqeta e parë.",
    steps: {
      plan: { title: "Zgjidhni abonimin", text: "Small, Medium ose Large – sipas sa hapësirë do të kenë lulet." },
      rhythm: { title: "Caktoni ritmin", text: "Çdo javë, çdo dy javë ose çdo muaj. Mund ta pezulloni në çdo kohë." },
      request: { title: "Dërgoni kërkesën", text: "Ju kontaktojmë me të gjitha detajet dhe bashkë me ju caktojmë vendin e dërgesës dhe datën e fillimit." },
    },
  },

  planner: {
    checkoutError: "Abonimi nuk mund të lidhet për momentin. Ju lutemi provoni përsëri më vonë.",
    nameRequired: "Ju lutemi shkruani emrin tuaj.",
    chooseRhythm: "Zgjidhni ritmin",
    rhythmLabel: "Ritmi i dërgesës",
    popular: "I preferuar",
    perDelivery: "/ dërgesë",
    discount: "{discount}% zbritje",
    selected: "I zgjedhur",
    choosePlan: "Zgjidhni {name}",
    requestPlan: "Kërkoni {name}",
    checkoutDoneTitle: "Faleminderit – abonimi juaj i luleve është lidhur.",
    checkoutDoneText: "Do të merrni një konfirmim me e-mail. Do t'ju kontaktojmë për të caktuar bashkë vendin e dërgesës dhe datën e fillimit.",
    checkout: "Lidhni abonimin",
    requestInstead: "Më mirë një kërkesë pa detyrim",
    selectionSummary: "{plan}, {frequency} – {price} për dërgesë.",
    securePayment: "Pagesë e sigurt përmes Stripe, mund ta anuloni në çdo kohë.",
    sendRequest: "Dërgoni kërkesën",
    noObligation: "Pa detyrim – ju kontaktojmë me të gjitha detajet.",
    thanksTitle: "Faleminderit për kërkesën tuaj.",
    thanksText: "E morëm kërkesën tuaj për abonimin {plan} ({frequency}) dhe do t'ju kontaktojmë me e-mail.",
    formEyebrow: "Kërkesë",
    formTitle: "Na tregoni shkurt çfarë dëshironi.",
    formText: "Pa kontratë, pa pagesë – ju kontaktojmë me të gjitha detajet dhe një propozim konkret.",
    plan: "Abonimi",
    rhythm: "Ritmi",
    messagePlaceholder: "Ku duhet të shkojnë lulet? Keni dëshira për ngjyrat apo një ditë të preferuar?",
    currentSelection: "Zgjedhja aktuale: {plan}, {frequency} – {price} për dërgesë",
  },
};

export default home;

import type { PartialMessages } from "@/i18n/messages";

/** bks – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Buketi od {price}",
    allOfVienna: "Dostava u cijelom Beču",
    greetingCardIncluded: "Kartica s porukom uključena",
  },
  trustBarLabel: "Naša obećanja",
  bestsellers: {
    eyebrow: "Ponuda",
    allLink: "Sve cvijeće",
  },
  occasions: {
    eyebrow: "Kupovina po prilici",
    allLink: "Sve prilike",
  },
  giftFinder: {
    eyebrow: "Pronalazač poklona",
    title: "Danas ste se sjetili nekoga?",
    text: "Tri kratka pitanja – i pokazat ćemo Vam bukete koji odgovaraju.",
    stepsLabel: "Tri pitanja",
    stepRecipient: "Za koga?",
    stepOccasion: "Prilika",
    stepBudget: "Budžet",
    cta: "Pronađite poklon",
  },
  collections: {
    eyebrow: "Kolekcije",
  },
  seasonal: {
    pricePending: "Cijena uskoro",
    from: "od",
  },
  howItWorks: {
    eyebrow: "Kako funkcioniše",
  },
  extras: {
    eyebrow: "Dodaci",
    allLink: "Svi dodaci",
    note: "Dodaci se dodaju uz buket – na stranici proizvoda ili u korpi.",
  },
  gallery: {
    eyebrow: "Galerija",
  },
  subscriptionTeaser: {
    eyebrow: "Pretplata na cvijeće",
    from: "Od",
    perDelivery: "po dostavi",
    rhythm: "Učestalost",
    imageAlt: "Sezonski buket iz naše pretplate na cvijeće",
  },
  reviews: {
    eyebrow: "Utisci kupaca",
    listLabel: "Recenzije",
    quote: "„{text}“",
    verifiedPurchase: "Potvrđena kupovina",
    previous: "Prethodne recenzije",
    next: "Sljedeće recenzije",
    textLabel: "Recenzija od {name}",
    demoNote: "Primjeri recenzija – prave recenzije uskoro.",
  },
  faq: {
    eyebrow: "Česta pitanja",
    text: "Odgovori na najčešća pitanja o dostavi, narudžbi i cvijeću.",
    allLink: "Sva pitanja i odgovori",
  },
  newsletter: {
    eyebrow: "Newsletter",
  },

  subscription: {
    title: "Pretplata na cvijeće",
    metaTitle: "Pretplata na cvijeće – {headline}",
    unavailable: "Pretplata na cvijeće trenutno nije dostupna.",
    unavailableText: "Radimo na tome. Do tada u trgovini možete pronaći svježe bukete za svaku priliku.",
    discoverFlowers: "Pogledajte cvijeće",
    contact: "Kontakt",
    audiencesLabel: "Za koga",
    choosePlan: "Odaberite pretplatu",
    imageAlt: "Sezonski buket iz pretplate na cvijeće",
    plansEyebrow: "Veličine pretplate",
    plansTitle: "Koja pretplata Vam odgovara?",
    plansText: "Cijene su po dostavi, uključujući dostavu u našem području dostave. Popusti zavise od učestalosti.",
    howEyebrow: "Kako funkcioniše",
    howTitle: "Tri koraka do prvog buketa.",
    steps: {
      plan: { title: "Odaberite pretplatu", text: "Small, Medium ili Large – zavisno od toga koliko prostora cvijeće treba da dobije." },
      rhythm: { title: "Odredite učestalost", text: "Sedmično, svake dvije sedmice ili mjesečno. Pauza je moguća u svakom trenutku." },
      request: { title: "Pošaljite upit", text: "Javit ćemo Vam se sa svim detaljima i dogovoriti s Vama mjesto dostave i datum početka." },
    },
  },

  planner: {
    checkoutError: "Zaključivanje pretplate trenutno nije moguće. Molimo pokušajte ponovo kasnije.",
    nameRequired: "Molimo unesite svoje ime.",
    chooseRhythm: "Odaberite učestalost",
    rhythmLabel: "Učestalost dostave",
    popular: "Popularno",
    perDelivery: "/ dostava",
    discount: "{discount}% popusta",
    selected: "Odabrano",
    choosePlan: "Odaberite {name}",
    requestPlan: "Zatražite {name}",
    checkoutDoneTitle: "Hvala – Vaša pretplata na cvijeće je zaključena.",
    checkoutDoneText: "Dobit ćete potvrdu e-mailom. Javit ćemo Vam se kako bismo dogovorili mjesto dostave i datum početka.",
    checkout: "Zaključite pretplatu",
    requestInstead: "Radije pošaljite neobavezujući upit",
    selectionSummary: "{plan}, {frequency} – {price} po dostavi.",
    securePayment: "Sigurno plaćanje putem Stripea, otkazivo u svakom trenutku.",
    sendRequest: "Pošaljite upit",
    noObligation: "Neobavezujuće – javit ćemo Vam se sa svim detaljima.",
    thanksTitle: "Hvala na Vašem upitu.",
    thanksText: "Primili smo Vaš upit za pretplatu {plan} ({frequency}) i javit ćemo Vam se e-mailom.",
    formEyebrow: "Upit",
    formTitle: "Recite nam ukratko šta želite.",
    formText: "Bez ugovora, bez plaćanja – javit ćemo Vam se sa svim detaljima i konkretnim prijedlogom.",
    plan: "Pretplata",
    rhythm: "Učestalost",
    messagePlaceholder: "Gdje treba dostaviti cvijeće? Imate li želje u vezi s bojama ili željeni dan?",
    currentSelection: "Trenutni izbor: {plan}, {frequency} – {price} po dostavi",
  },
};

export default home;

import type { PartialMessages } from "@/i18n/messages";

/** fi – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Kimput alk. {price}",
    allOfVienna: "Toimitus koko Wieniin",
    greetingCardIncluded: "Tervehdyskortti sisältyy",
  },
  trustBarLabel: "Lupauksemme",
  bestsellers: {
    eyebrow: "Valikoima",
    allLink: "Kaikki kukat",
  },
  occasions: {
    eyebrow: "Valitse tilaisuuden mukaan",
    allLink: "Kaikki tilaisuudet",
  },
  giftFinder: {
    eyebrow: "Lahjanetsijä",
    title: "Tuliko joku tänään mieleen?",
    text: "Kolme lyhyttä kysymystä – ja näytämme sinulle sopivat kimput.",
    stepsLabel: "Kolme kysymystä",
    stepRecipient: "Kenelle?",
    stepOccasion: "Tilaisuus",
    stepBudget: "Budjetti",
    cta: "Etsi lahja",
  },
  collections: {
    eyebrow: "Kokoelmat",
  },
  seasonal: {
    pricePending: "Hinta tulossa",
    from: "alk.",
  },
  howItWorks: {
    eyebrow: "Näin se toimii",
  },
  extras: {
    eyebrow: "Lisät",
    allLink: "Kaikki lisät",
    note: "Lisät liitetään kimppuun – tuotesivulla tai ostoskorissa.",
  },
  gallery: {
    eyebrow: "Galleria",
  },
  subscriptionTeaser: {
    eyebrow: "Kukkatilaus",
    from: "Alk.",
    perDelivery: "/ toimitus",
    rhythm: "Rytmi",
    imageAlt: "Sesongin kimppu kukkatilauksestamme",
  },
  reviews: {
    eyebrow: "Asiakkaiden kokemuksia",
    listLabel: "Arvostelut",
    quote: "”{text}”",
    verifiedPurchase: "Vahvistettu ostos",
    previous: "Edelliset arvostelut",
    next: "Seuraavat arvostelut",
    textLabel: "Arvostelu: {name}",
    demoNote: "Esimerkkiarvosteluja – oikeat arvostelut tulossa.",
  },
  faq: {
    eyebrow: "UKK",
    text: "Vastaukset yleisimpiin kysymyksiin toimituksesta, tilaamisesta ja kukista.",
    allLink: "Kaikki kysymykset ja vastaukset",
  },
  newsletter: {
    eyebrow: "Uutiskirje",
  },

  subscription: {
    title: "Kukkatilaus",
    metaTitle: "Kukkatilaus – {headline}",
    unavailable: "Kukkatilaus ei ole tällä hetkellä saatavilla.",
    unavailableText: "Työstämme sitä. Sillä välin löydät kaupasta tuoreita kimppuja joka tilaisuuteen.",
    discoverFlowers: "Tutustu kukkiin",
    contact: "Yhteystiedot",
    audiencesLabel: "Kenelle",
    choosePlan: "Valitse tilaus",
    imageAlt: "Sesongin kimppu kukkatilauksesta",
    plansEyebrow: "Tilauskoot",
    plansTitle: "Mikä tilaus sopii sinulle?",
    plansText: "Hinnat ovat toimituskohtaisia ja sisältävät toimituksen toimitusalueellamme. Alennukset rytmin mukaan.",
    howEyebrow: "Näin se toimii",
    howTitle: "Kolme askelta ensimmäiseen kimppuun.",
    steps: {
      plan: { title: "Valitse tilaus", text: "Small, Medium tai Large – sen mukaan, kuinka paljon tilaa kukat saavat." },
      rhythm: { title: "Valitse rytmi", text: "Viikoittain, joka toinen viikko tai kuukausittain. Voit pitää taukoa milloin tahansa." },
      request: { title: "Lähetä tiedustelu", text: "Otamme yhteyttä kaikkien yksityiskohtien kanssa ja sovimme kanssasi toimituspaikan ja aloituspäivän." },
    },
  },

  planner: {
    checkoutError: "Tilauksen tekeminen ei juuri nyt onnistu. Yritä myöhemmin uudelleen.",
    nameRequired: "Anna nimesi.",
    chooseRhythm: "Valitse rytmi",
    rhythmLabel: "Toimitusrytmi",
    popular: "Suosittu",
    perDelivery: "/ toimitus",
    discount: "{discount} % alennus",
    selected: "Valittu",
    choosePlan: "Valitse {name}",
    requestPlan: "Tiedustele: {name}",
    checkoutDoneTitle: "Kiitos – kukkatilauksesi on tehty.",
    checkoutDoneText: "Saat vahvistuksen sähköpostiisi. Otamme yhteyttä sopiaksemme kanssasi toimituspaikan ja aloituspäivän.",
    checkout: "Tee tilaus",
    requestInstead: "Lähetä mieluummin sitoumukseton tiedustelu",
    selectionSummary: "{plan}, {frequency} – {price} / toimitus.",
    securePayment: "Turvallinen maksu Stripen kautta, irtisanottavissa milloin tahansa.",
    sendRequest: "Lähetä tiedustelu",
    noObligation: "Sitoumukseton – otamme yhteyttä kaikkien yksityiskohtien kanssa.",
    thanksTitle: "Kiitos tiedustelustasi.",
    thanksText: "Olemme vastaanottaneet tiedustelusi tilauksesta {plan} ({frequency}) ja otamme sinuun yhteyttä sähköpostitse.",
    formEyebrow: "Tiedustelu",
    formTitle: "Kerro lyhyesti, mitä toivot.",
    formText: "Ei sopimusta, ei maksua – otamme yhteyttä kaikkien yksityiskohtien ja konkreettisen ehdotuksen kanssa.",
    plan: "Tilaus",
    rhythm: "Rytmi",
    messagePlaceholder: "Minne kukat toimitetaan? Onko sinulla väritoiveita tai toivepäivä?",
    currentSelection: "Nykyinen valinta: {plan}, {frequency} – {price} / toimitus",
  },
};

export default home;

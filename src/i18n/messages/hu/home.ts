import type { PartialMessages } from "@/i18n/messages";

/** hu – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Csokrok {price}-tól",
    allOfVienna: "Kiszállítás egész Bécsben",
    greetingCardIncluded: "Üdvözlőkártyával együtt",
  },
  trustBarLabel: "Ígéreteink",
  bestsellers: {
    eyebrow: "Kínálat",
    allLink: "Összes virág",
  },
  occasions: {
    eyebrow: "Vásárlás alkalom szerint",
    allLink: "Összes alkalom",
  },
  giftFinder: {
    eyebrow: "Ajándékkereső",
    title: "Gondoltál ma valakire?",
    text: "Három rövid kérdés – és megmutatjuk az illő csokrokat.",
    stepsLabel: "A három kérdés",
    stepRecipient: "Kinek?",
    stepOccasion: "Alkalom",
    stepBudget: "Keret",
    cta: "Ajándék keresése",
  },
  collections: {
    eyebrow: "Kollekciók",
  },
  seasonal: {
    pricePending: "Az ár hamarosan",
    from: "kezdőár",
  },
  howItWorks: {
    eyebrow: "Így működik",
  },
  extras: {
    eyebrow: "Extrák",
    allLink: "Összes extra",
    note: "Az extrákat egy csokorhoz lehet hozzáadni – a termékoldalon vagy a kosárban.",
  },
  gallery: {
    eyebrow: "Galéria",
  },
  subscriptionTeaser: {
    eyebrow: "Virág-előfizetés",
    from: "Kezdőár",
    perDelivery: "kiszállításonként",
    rhythm: "Gyakoriság",
    imageAlt: "Szezonális csokor a virág-előfizetésünkből",
  },
  reviews: {
    eyebrow: "Vásárlói vélemények",
    listLabel: "Értékelések",
    quote: "„{text}”",
    verifiedPurchase: "Ellenőrzött vásárlás",
    demoNote: "Példaértékelések – a valódi értékelések hamarosan következnek.",
  },
  faq: {
    eyebrow: "GYIK",
    text: "Válaszok a leggyakoribb kérdésekre a kiszállításról, a rendelésről és a virágokról.",
    allLink: "Összes kérdés és válasz",
  },
  newsletter: {
    eyebrow: "Hírlevél",
  },

  subscription: {
    title: "Virág-előfizetés",
    metaTitle: "Virág-előfizetés – {headline}",
    unavailable: "A virág-előfizetés jelenleg nem érhető el.",
    unavailableText: "Dolgozunk rajta. Addig is minden alkalomra találsz friss csokrokat a webshopban.",
    discoverFlowers: "Virágok felfedezése",
    contact: "Kapcsolat",
    audiencesLabel: "Kinek szól",
    choosePlan: "Előfizetés kiválasztása",
    imageAlt: "Szezonális csokor a virág-előfizetésből",
    plansEyebrow: "Előfizetési méretek",
    plansTitle: "Melyik előfizetés illik hozzád?",
    plansText: "Az árak kiszállításonként értendők, a kiszállítási területünkön belüli kiszállítással együtt. Kedvezmények a gyakoriságtól függően.",
    howEyebrow: "Hogyan működik",
    howTitle: "Három lépés az első csokorig.",
    steps: {
      plan: { title: "Előfizetés kiválasztása", text: "Small, Medium vagy Large – attól függően, mennyi helyet kapnak a virágok." },
      rhythm: { title: "Gyakoriság megadása", text: "Hetente, kéthetente vagy havonta. Szüneteltetni bármikor lehet." },
      request: { title: "Érdeklődés elküldése", text: "Minden részlettel jelentkezünk, és egyeztetjük veled a kiszállítás helyét és a kezdés időpontját." },
    },
  },

  planner: {
    checkoutError: "Az előfizetés megkötése most nem lehetséges. Kérjük, próbáld újra később.",
    nameRequired: "Kérjük, add meg a neved.",
    chooseRhythm: "Gyakoriság kiválasztása",
    rhythmLabel: "Kiszállítási gyakoriság",
    popular: "Népszerű",
    perDelivery: "/ kiszállítás",
    discount: "{discount}% kedvezmény",
    selected: "Kiválasztva",
    choosePlan: "{name} kiválasztása",
    requestPlan: "Érdeklődés: {name}",
    checkoutDoneTitle: "Köszönjük – a virág-előfizetésed létrejött.",
    checkoutDoneText: "E-mailben visszaigazolást kapsz. Jelentkezünk, hogy egyeztessük veled a kiszállítás helyét és a kezdés időpontját.",
    checkout: "Előfizetés megkötése",
    requestInstead: "Inkább kötelezettség nélkül érdeklődöm",
    selectionSummary: "{plan}, {frequency} – {price} kiszállításonként.",
    securePayment: "Biztonságos fizetés a Stripe-on keresztül, bármikor lemondható.",
    sendRequest: "Érdeklődés elküldése",
    noObligation: "Kötelezettség nélkül – minden részlettel jelentkezünk.",
    thanksTitle: "Köszönjük az érdeklődésed.",
    thanksText: "Megkaptuk az érdeklődésedet a(z) {plan} előfizetésre ({frequency}), és e-mailben jelentkezünk.",
    formEyebrow: "Érdeklődés",
    formTitle: "Mondd el röviden, mit szeretnél.",
    formText: "Nincs szerződés, nincs fizetés – minden részlettel és egy konkrét javaslattal jelentkezünk.",
    plan: "Előfizetés",
    rhythm: "Gyakoriság",
    messagePlaceholder: "Hová menjenek a virágok? Van kedvenc színed vagy kívánt napod?",
    currentSelection: "Jelenlegi választás: {plan}, {frequency} – {price} kiszállításonként",
  },
};

export default home;

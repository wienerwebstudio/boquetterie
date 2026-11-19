/** UI texts – home (German source). Homepage sections and the subscription page. */
const home = {
  heroFacts: {
    bouquetsFrom: "Sträuße ab {price}",
    allOfVienna: "Lieferung in ganz Wien",
    greetingCardIncluded: "Grußkarte inklusive",
  },
  trustBarLabel: "Unsere Versprechen",
  bestsellers: {
    eyebrow: "Sortiment",
    allLink: "Alle Blumen",
  },
  occasions: {
    eyebrow: "Shoppen nach Anlass",
    allLink: "Alle Anlässe",
  },
  giftFinder: {
    eyebrow: "Geschenk-Finder",
    title: "Heute an jemanden gedacht?",
    text: "Drei kurze Fragen – und wir zeigen dir Sträuße, die passen.",
    stepsLabel: "Die drei Fragen",
    stepRecipient: "Für wen?",
    stepOccasion: "Anlass",
    stepBudget: "Budget",
    cta: "Geschenk finden",
  },
  collections: {
    eyebrow: "Kollektionen",
  },
  seasonal: {
    pricePending: "Preis folgt",
    from: "ab",
  },
  howItWorks: {
    eyebrow: "So funktioniert es",
  },
  extras: {
    eyebrow: "Extras",
    allLink: "Alle Extras",
    note: "Extras werden zu einem Strauß hinzugefügt – auf der Produktseite oder im Warenkorb.",
  },
  gallery: {
    eyebrow: "Galerie",
  },
  subscriptionTeaser: {
    eyebrow: "Blumen-Abo",
    from: "Ab",
    perDelivery: "pro Lieferung",
    rhythm: "Rhythmus",
    imageAlt: "Saisonaler Strauß aus unserem Blumen-Abo",
  },
  reviews: {
    eyebrow: "Kundenstimmen",
    listLabel: "Bewertungen",
    quote: "„{text}“",
    verifiedPurchase: "Verifizierter Kauf",
    demoNote: "Beispielbewertungen – echte Bewertungen folgen.",
  },
  faq: {
    eyebrow: "FAQ",
    text: "Antworten auf die häufigsten Fragen zu Lieferung, Bestellung und Blumen.",
    allLink: "Alle Fragen & Antworten",
  },
  newsletter: {
    eyebrow: "Newsletter",
  },

  /* ---------- Subscription page (/blumen-abo) ---------- */
  subscription: {
    title: "Blumen-Abo",
    metaTitle: "Blumen-Abo – {headline}",
    unavailable: "Das Blumen-Abo ist derzeit nicht verfügbar.",
    unavailableText: "Wir arbeiten daran. Bis dahin findest du frische Sträuße für jeden Anlass im Shop.",
    discoverFlowers: "Blumen entdecken",
    contact: "Kontakt",
    audiencesLabel: "Für wen",
    choosePlan: "Abo auswählen",
    imageAlt: "Saisonaler Strauß aus dem Blumen-Abo",
    plansEyebrow: "Abo-Größen",
    plansTitle: "Welches Abo passt zu dir?",
    plansText: "Preise verstehen sich pro Lieferung inklusive Lieferung in unserem Liefergebiet. Rabatte je nach Rhythmus.",
    howEyebrow: "Wie es funktioniert",
    howTitle: "Drei Schritte bis zum ersten Strauß.",
    steps: {
      plan: { title: "Abo wählen", text: "Small, Medium oder Large – je nachdem, wie viel Raum die Blumen bekommen sollen." },
      rhythm: { title: "Rhythmus festlegen", text: "Wöchentlich, alle zwei Wochen oder monatlich. Pausieren ist jederzeit möglich." },
      request: { title: "Anfrage senden", text: "Wir melden uns mit allen Details und stimmen Lieferort und Starttermin mit dir ab." },
    },
  },

  /* ---------- Subscription planner (interactive part) ---------- */
  planner: {
    checkoutError: "Der Abo-Abschluss ist gerade nicht möglich. Bitte versuch es später noch einmal.",
    nameRequired: "Bitte gib deinen Namen ein.",
    chooseRhythm: "Rhythmus wählen",
    rhythmLabel: "Lieferrhythmus",
    popular: "Beliebt",
    perDelivery: "/ Lieferung",
    discount: "{discount}% Rabatt",
    selected: "Ausgewählt",
    choosePlan: "{name} wählen",
    requestPlan: "{name} anfragen",
    checkoutDoneTitle: "Danke – dein Blumen-Abo ist abgeschlossen.",
    checkoutDoneText: "Du bekommst eine Bestätigung per E-Mail. Wir melden uns, um Lieferort und Starttermin mit dir abzustimmen.",
    checkout: "Abo abschließen",
    requestInstead: "Lieber unverbindlich anfragen",
    selectionSummary: "{plan}, {frequency} – {price} pro Lieferung.",
    securePayment: "Sichere Zahlung über Stripe, jederzeit kündbar.",
    sendRequest: "Anfrage senden",
    noObligation: "Unverbindlich – wir melden uns mit allen Details.",
    thanksTitle: "Danke für deine Anfrage.",
    thanksText: "Wir haben deine Anfrage für das Abo {plan} ({frequency}) erhalten und melden uns per E-Mail bei dir.",
    formEyebrow: "Anfrage",
    formTitle: "Erzähl uns kurz, was du dir wünschst.",
    formText: "Kein Vertrag, keine Zahlung – wir melden uns mit allen Details und einem konkreten Vorschlag.",
    plan: "Abo",
    rhythm: "Rhythmus",
    messagePlaceholder: "Wohin sollen die Blumen? Gibt es Farbwünsche oder einen Wunschtag?",
    currentSelection: "Aktuelle Auswahl: {plan}, {frequency} – {price} pro Lieferung",
  },
};
export default home;

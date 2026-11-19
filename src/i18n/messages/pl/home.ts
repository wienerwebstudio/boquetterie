import type { PartialMessages } from "@/i18n/messages";

/** pl – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Bukiety od {price}",
    allOfVienna: "Dostawa na terenie całego Wiednia",
    greetingCardIncluded: "Kartka z życzeniami w cenie",
  },
  trustBarLabel: "Nasze obietnice",
  bestsellers: {
    eyebrow: "Oferta",
    allLink: "Wszystkie kwiaty",
  },
  occasions: {
    eyebrow: "Zakupy według okazji",
    allLink: "Wszystkie okazje",
  },
  giftFinder: {
    eyebrow: "Wyszukiwarka prezentów",
    title: "Myślisz dziś o kimś?",
    text: "Trzy krótkie pytania – a my pokażemy ci pasujące bukiety.",
    stepsLabel: "Trzy pytania",
    stepRecipient: "Dla kogo?",
    stepOccasion: "Okazja",
    stepBudget: "Budżet",
    cta: "Znajdź prezent",
  },
  collections: {
    eyebrow: "Kolekcje",
  },
  seasonal: {
    pricePending: "Cena wkrótce",
    from: "od",
  },
  howItWorks: {
    eyebrow: "Jak to działa",
  },
  extras: {
    eyebrow: "Dodatki",
    allLink: "Wszystkie dodatki",
    note: "Dodatki dołączasz do bukietu – na stronie produktu lub w koszyku.",
  },
  gallery: {
    eyebrow: "Galeria",
  },
  subscriptionTeaser: {
    eyebrow: "Abonament kwiatowy",
    from: "Od",
    perDelivery: "za dostawę",
    rhythm: "Częstotliwość",
    imageAlt: "Sezonowy bukiet z naszego abonamentu kwiatowego",
  },
  reviews: {
    eyebrow: "Opinie klientów",
    listLabel: "Opinie",
    quote: "„{text}”",
    verifiedPurchase: "Zweryfikowany zakup",
    demoNote: "Przykładowe opinie – prawdziwe opinie pojawią się wkrótce.",
  },
  faq: {
    eyebrow: "FAQ",
    text: "Odpowiedzi na najczęstsze pytania o dostawę, zamówienie i kwiaty.",
    allLink: "Wszystkie pytania i odpowiedzi",
  },
  newsletter: {
    eyebrow: "Newsletter",
  },

  subscription: {
    title: "Abonament kwiatowy",
    metaTitle: "Abonament kwiatowy – {headline}",
    unavailable: "Abonament kwiatowy jest obecnie niedostępny.",
    unavailableText: "Pracujemy nad tym. Do tego czasu świeże bukiety na każdą okazję znajdziesz w sklepie.",
    discoverFlowers: "Odkryj kwiaty",
    contact: "Kontakt",
    audiencesLabel: "Dla kogo",
    choosePlan: "Wybierz abonament",
    imageAlt: "Sezonowy bukiet z abonamentu kwiatowego",
    plansEyebrow: "Rozmiary abonamentu",
    plansTitle: "Który abonament pasuje do ciebie?",
    plansText: "Ceny dotyczą jednej dostawy i obejmują dostawę na naszym obszarze dostaw. Rabaty zależą od częstotliwości.",
    howEyebrow: "Jak to działa",
    howTitle: "Trzy kroki do pierwszego bukietu.",
    steps: {
      plan: { title: "Wybierz abonament", text: "Small, Medium lub Large – w zależności od tego, ile miejsca mają mieć kwiaty." },
      rhythm: { title: "Ustal częstotliwość", text: "Co tydzień, co dwa tygodnie lub raz w miesiącu. Przerwę możesz zrobić w każdej chwili." },
      request: { title: "Wyślij zapytanie", text: "Odezwiemy się ze wszystkimi szczegółami i razem ustalimy miejsce dostawy oraz termin rozpoczęcia." },
    },
  },

  planner: {
    checkoutError: "Zawarcie abonamentu jest w tej chwili niemożliwe. Spróbuj ponownie później.",
    nameRequired: "Podaj swoje imię i nazwisko.",
    chooseRhythm: "Wybierz częstotliwość",
    rhythmLabel: "Częstotliwość dostaw",
    popular: "Popularne",
    perDelivery: "/ dostawa",
    discount: "{discount}% rabatu",
    selected: "Wybrano",
    choosePlan: "Wybierz {name}",
    requestPlan: "Zapytaj o {name}",
    checkoutDoneTitle: "Dziękujemy – twój abonament kwiatowy został zawarty.",
    checkoutDoneText: "Otrzymasz potwierdzenie e-mailem. Odezwiemy się, aby ustalić z tobą miejsce dostawy i termin rozpoczęcia.",
    checkout: "Zawrzyj abonament",
    requestInstead: "Wolę zapytać niezobowiązująco",
    selectionSummary: "{plan}, {frequency} – {price} za dostawę.",
    securePayment: "Bezpieczna płatność przez Stripe, możliwość rezygnacji w każdej chwili.",
    sendRequest: "Wyślij zapytanie",
    noObligation: "Niezobowiązująco – odezwiemy się ze wszystkimi szczegółami.",
    thanksTitle: "Dziękujemy za zapytanie.",
    thanksText: "Otrzymaliśmy twoje zapytanie o abonament {plan} ({frequency}) i odezwiemy się do ciebie e-mailem.",
    formEyebrow: "Zapytanie",
    formTitle: "Napisz nam krótko, czego sobie życzysz.",
    formText: "Bez umowy, bez płatności – odezwiemy się ze wszystkimi szczegółami i konkretną propozycją.",
    plan: "Abonament",
    rhythm: "Częstotliwość",
    messagePlaceholder: "Dokąd mają trafić kwiaty? Masz życzenia co do kolorów albo preferowany dzień?",
    currentSelection: "Aktualny wybór: {plan}, {frequency} – {price} za dostawę",
  },
};

export default home;

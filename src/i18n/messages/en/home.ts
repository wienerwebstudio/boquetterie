import type { PartialMessages } from "@/i18n/messages";

/** en – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Bouquets from {price}",
    allOfVienna: "Delivery across all of Vienna",
    greetingCardIncluded: "Greeting card included",
  },
  trustBarLabel: "Our promises",
  bestsellers: {
    eyebrow: "Our range",
    allLink: "All flowers",
  },
  occasions: {
    eyebrow: "Shop by occasion",
    allLink: "All occasions",
  },
  giftFinder: {
    eyebrow: "Gift finder",
    title: "Thinking of someone today?",
    text: "Three quick questions – and we'll show you bouquets that fit.",
    stepsLabel: "The three questions",
    stepRecipient: "For whom?",
    stepOccasion: "Occasion",
    stepBudget: "Budget",
    cta: "Find a gift",
  },
  collections: {
    eyebrow: "Collections",
  },
  seasonal: {
    pricePending: "Price to follow",
    from: "from",
  },
  howItWorks: {
    eyebrow: "How it works",
  },
  extras: {
    eyebrow: "Extras",
    allLink: "All extras",
    note: "Extras are added to a bouquet – on the product page or in the basket.",
  },
  gallery: {
    eyebrow: "Gallery",
  },
  subscriptionTeaser: {
    eyebrow: "Flower subscription",
    from: "From",
    perDelivery: "per delivery",
    rhythm: "Frequency",
    imageAlt: "Seasonal bouquet from our flower subscription",
  },
  reviews: {
    eyebrow: "Customer reviews",
    listLabel: "Reviews",
    quote: "“{text}”",
    verifiedPurchase: "Verified purchase",
    demoNote: "Sample reviews – real reviews to follow.",
  },
  faq: {
    eyebrow: "FAQ",
    text: "Answers to the most common questions about delivery, ordering and flowers.",
    allLink: "All questions & answers",
  },
  newsletter: {
    eyebrow: "Newsletter",
  },

  subscription: {
    title: "Flower subscription",
    metaTitle: "Flower subscription – {headline}",
    unavailable: "The flower subscription is currently unavailable.",
    unavailableText: "We're working on it. Until then, you'll find fresh bouquets for every occasion in the shop.",
    discoverFlowers: "Discover flowers",
    contact: "Contact",
    audiencesLabel: "Who it's for",
    choosePlan: "Choose a subscription",
    imageAlt: "Seasonal bouquet from the flower subscription",
    plansEyebrow: "Subscription sizes",
    plansTitle: "Which subscription suits you?",
    plansText: "Prices are per delivery, including delivery within our delivery area. Discounts depend on the frequency.",
    howEyebrow: "How it works",
    howTitle: "Three steps to your first bouquet.",
    steps: {
      plan: { title: "Choose a subscription", text: "Small, Medium or Large – depending on how much space the flowers should have." },
      rhythm: { title: "Set the frequency", text: "Weekly, every two weeks or monthly. You can pause at any time." },
      request: { title: "Send a request", text: "We'll get back to you with all the details and agree the delivery address and start date with you." },
    },
  },

  planner: {
    checkoutError: "Taking out a subscription isn't possible right now. Please try again later.",
    nameRequired: "Please enter your name.",
    chooseRhythm: "Choose frequency",
    rhythmLabel: "Delivery frequency",
    popular: "Popular",
    perDelivery: "/ delivery",
    discount: "{discount}% off",
    selected: "Selected",
    choosePlan: "Choose {name}",
    requestPlan: "Request {name}",
    checkoutDoneTitle: "Thank you – your flower subscription is all set.",
    checkoutDoneText: "You'll receive a confirmation by email. We'll get in touch to agree the delivery address and start date with you.",
    checkout: "Subscribe",
    requestInstead: "Send a no-obligation request instead",
    selectionSummary: "{plan}, {frequency} – {price} per delivery.",
    securePayment: "Secure payment via Stripe, cancel at any time.",
    sendRequest: "Send request",
    noObligation: "No obligation – we'll get back to you with all the details.",
    thanksTitle: "Thank you for your request.",
    thanksText: "We've received your request for the {plan} subscription ({frequency}) and will get back to you by email.",
    formEyebrow: "Request",
    formTitle: "Tell us briefly what you'd like.",
    formText: "No contract, no payment – we'll get back to you with all the details and a concrete suggestion.",
    plan: "Subscription",
    rhythm: "Frequency",
    messagePlaceholder: "Where should the flowers go? Any colour preferences or a preferred day?",
    currentSelection: "Current selection: {plan}, {frequency} – {price} per delivery",
  },
};

export default home;

import type { PartialMessages } from "@/i18n/messages";

/** fr – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Bouquets dès {price}",
    allOfVienna: "Livraison dans tout Vienne",
    greetingCardIncluded: "Carte message incluse",
  },
  trustBarLabel: "Nos engagements",
  bestsellers: {
    eyebrow: "Sélection",
    allLink: "Toutes les fleurs",
  },
  occasions: {
    eyebrow: "Acheter par occasion",
    allLink: "Toutes les occasions",
  },
  giftFinder: {
    eyebrow: "Guide cadeau",
    title: "Vous avez pensé à quelqu’un aujourd’hui ?",
    text: "Trois petites questions – et nous vous montrons les bouquets qui conviennent.",
    stepsLabel: "Les trois questions",
    stepRecipient: "Pour qui ?",
    stepOccasion: "Occasion",
    stepBudget: "Budget",
    cta: "Trouver un cadeau",
  },
  collections: {
    eyebrow: "Collections",
  },
  seasonal: {
    pricePending: "Prix à venir",
    from: "dès",
  },
  howItWorks: {
    eyebrow: "Comment ça marche",
  },
  extras: {
    eyebrow: "Extras",
    allLink: "Tous les extras",
    note: "Les extras s’ajoutent à un bouquet – sur la page produit ou dans le panier.",
  },
  gallery: {
    eyebrow: "Galerie",
  },
  subscriptionTeaser: {
    eyebrow: "Abonnement floral",
    from: "Dès",
    perDelivery: "par livraison",
    rhythm: "Fréquence",
    imageAlt: "Bouquet de saison de notre abonnement floral",
  },
  reviews: {
    eyebrow: "Avis clients",
    listLabel: "Avis",
    quote: "« {text} »",
    verifiedPurchase: "Achat vérifié",
    previous: "Avis précédents",
    next: "Avis suivants",
    textLabel: "Avis de {name}",
    demoNote: "Exemples d’avis – de vrais avis suivront.",
  },
  faq: {
    eyebrow: "FAQ",
    text: "Les réponses aux questions les plus fréquentes sur la livraison, la commande et les fleurs.",
    allLink: "Toutes les questions & réponses",
  },
  newsletter: {
    eyebrow: "Newsletter",
  },

  subscription: {
    title: "Abonnement floral",
    metaTitle: "Abonnement floral – {headline}",
    unavailable: "L’abonnement floral n’est pas disponible pour le moment.",
    unavailableText: "Nous y travaillons. En attendant, vous trouverez dans la boutique des bouquets frais pour chaque occasion.",
    discoverFlowers: "Découvrir nos fleurs",
    contact: "Contact",
    audiencesLabel: "Pour qui",
    choosePlan: "Choisir un abonnement",
    imageAlt: "Bouquet de saison de l’abonnement floral",
    plansEyebrow: "Formules",
    plansTitle: "Quel abonnement vous convient ?",
    plansText: "Prix par livraison, livraison incluse dans notre zone de livraison. Réductions selon la fréquence.",
    howEyebrow: "Comment ça marche",
    howTitle: "Trois étapes jusqu’au premier bouquet.",
    steps: {
      plan: { title: "Choisir la formule", text: "Small, Medium ou Large – selon la place que vous voulez donner aux fleurs." },
      rhythm: { title: "Définir la fréquence", text: "Chaque semaine, toutes les deux semaines ou chaque mois. Une pause est possible à tout moment." },
      request: { title: "Envoyer la demande", text: "Nous vous recontactons avec tous les détails et convenons avec vous du lieu de livraison et de la date de début." },
    },
  },

  planner: {
    checkoutError: "La souscription n’est pas possible pour le moment. Veuillez réessayer plus tard.",
    nameRequired: "Veuillez indiquer votre nom.",
    chooseRhythm: "Choisir la fréquence",
    rhythmLabel: "Fréquence de livraison",
    popular: "Populaire",
    perDelivery: "/ livraison",
    discount: "{discount} % de réduction",
    selected: "Sélectionné",
    choosePlan: "Choisir {name}",
    requestPlan: "Demander {name}",
    checkoutDoneTitle: "Merci – votre abonnement floral est souscrit.",
    checkoutDoneText: "Vous recevrez une confirmation par e-mail. Nous vous recontacterons pour convenir du lieu de livraison et de la date de début.",
    checkout: "Souscrire l’abonnement",
    requestInstead: "Plutôt faire une demande sans engagement",
    selectionSummary: "{plan}, {frequency} – {price} par livraison.",
    securePayment: "Paiement sécurisé via Stripe, résiliable à tout moment.",
    sendRequest: "Envoyer la demande",
    noObligation: "Sans engagement – nous vous recontactons avec tous les détails.",
    thanksTitle: "Merci pour votre demande.",
    thanksText: "Nous avons bien reçu votre demande pour l’abonnement {plan} ({frequency}) et vous répondrons par e-mail.",
    formEyebrow: "Demande",
    formTitle: "Dites-nous en quelques mots ce que vous souhaitez.",
    formText: "Ni contrat, ni paiement – nous vous recontactons avec tous les détails et une proposition concrète.",
    plan: "Abonnement",
    rhythm: "Fréquence",
    messagePlaceholder: "Où doivent aller les fleurs ? Des couleurs préférées ou un jour souhaité ?",
    currentSelection: "Sélection actuelle : {plan}, {frequency} – {price} par livraison",
  },
};

export default home;

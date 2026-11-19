import type { PartialMessages } from "@/i18n/messages";

/** es – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Ramos desde {price}",
    allOfVienna: "Entrega en toda Viena",
    greetingCardIncluded: "Tarjeta de dedicatoria incluida",
  },
  trustBarLabel: "Nuestras promesas",
  bestsellers: {
    eyebrow: "Surtido",
    allLink: "Todas las flores",
  },
  occasions: {
    eyebrow: "Comprar por ocasión",
    allLink: "Todas las ocasiones",
  },
  giftFinder: {
    eyebrow: "Buscador de regalos",
    title: "¿Has pensado hoy en alguien?",
    text: "Tres preguntas rápidas y te mostramos los ramos que encajan.",
    stepsLabel: "Las tres preguntas",
    stepRecipient: "¿Para quién?",
    stepOccasion: "Ocasión",
    stepBudget: "Presupuesto",
    cta: "Encontrar un regalo",
  },
  collections: {
    eyebrow: "Colecciones",
  },
  seasonal: {
    pricePending: "Precio próximamente",
    from: "desde",
  },
  howItWorks: {
    eyebrow: "Así funciona",
  },
  extras: {
    eyebrow: "Extras",
    allLink: "Todos los extras",
    note: "Los extras se añaden a un ramo, en la página del producto o en el carrito.",
  },
  gallery: {
    eyebrow: "Galería",
  },
  subscriptionTeaser: {
    eyebrow: "Suscripción de flores",
    from: "Desde",
    perDelivery: "por entrega",
    rhythm: "Frecuencia",
    imageAlt: "Ramo de temporada de nuestra suscripción de flores",
  },
  reviews: {
    eyebrow: "Opiniones de clientes",
    listLabel: "Valoraciones",
    quote: "«{text}»",
    verifiedPurchase: "Compra verificada",
    demoNote: "Valoraciones de ejemplo: pronto habrá valoraciones reales.",
  },
  faq: {
    eyebrow: "Preguntas frecuentes",
    text: "Respuestas a las preguntas más frecuentes sobre la entrega, los pedidos y las flores.",
    allLink: "Todas las preguntas y respuestas",
  },
  newsletter: {
    eyebrow: "Newsletter",
  },

  subscription: {
    title: "Suscripción de flores",
    metaTitle: "Suscripción de flores – {headline}",
    unavailable: "La suscripción de flores no está disponible en este momento.",
    unavailableText: "Estamos trabajando en ello. Mientras tanto, encontrarás ramos frescos para cada ocasión en la tienda.",
    discoverFlowers: "Descubrir flores",
    contact: "Contacto",
    audiencesLabel: "Para quién",
    choosePlan: "Elegir suscripción",
    imageAlt: "Ramo de temporada de la suscripción de flores",
    plansEyebrow: "Tamaños de suscripción",
    plansTitle: "¿Qué suscripción va contigo?",
    plansText: "Los precios son por entrega e incluyen la entrega en nuestra zona de reparto. Descuentos según la frecuencia.",
    howEyebrow: "Cómo funciona",
    howTitle: "Tres pasos hasta tu primer ramo.",
    steps: {
      plan: { title: "Elige tu suscripción", text: "Small, Medium o Large, según cuánto espacio quieras darles a las flores." },
      rhythm: { title: "Define la frecuencia", text: "Semanal, cada dos semanas o mensual. Puedes pausarla en cualquier momento." },
      request: { title: "Envía tu solicitud", text: "Te contactamos con todos los detalles y acordamos contigo el lugar de entrega y la fecha de inicio." },
    },
  },

  planner: {
    checkoutError: "Ahora mismo no es posible contratar la suscripción. Inténtalo de nuevo más tarde.",
    nameRequired: "Indica tu nombre.",
    chooseRhythm: "Elegir frecuencia",
    rhythmLabel: "Frecuencia de entrega",
    popular: "Popular",
    perDelivery: "/ entrega",
    discount: "{discount}% de descuento",
    selected: "Seleccionado",
    choosePlan: "Elegir {name}",
    requestPlan: "Solicitar {name}",
    checkoutDoneTitle: "Gracias: tu suscripción de flores está contratada.",
    checkoutDoneText: "Recibirás una confirmación por correo electrónico. Te contactaremos para acordar contigo el lugar de entrega y la fecha de inicio.",
    checkout: "Contratar suscripción",
    requestInstead: "Prefiero solicitar información sin compromiso",
    selectionSummary: "{plan}, {frequency} – {price} por entrega.",
    securePayment: "Pago seguro a través de Stripe, cancelable en cualquier momento.",
    sendRequest: "Enviar solicitud",
    noObligation: "Sin compromiso: te contactamos con todos los detalles.",
    thanksTitle: "Gracias por tu solicitud.",
    thanksText: "Hemos recibido tu solicitud para la suscripción {plan} ({frequency}) y te escribiremos por correo electrónico.",
    formEyebrow: "Solicitud",
    formTitle: "Cuéntanos brevemente qué te gustaría.",
    formText: "Sin contrato ni pago: te contactamos con todos los detalles y una propuesta concreta.",
    plan: "Suscripción",
    rhythm: "Frecuencia",
    messagePlaceholder: "¿Adónde deben ir las flores? ¿Tienes preferencias de color o un día preferido?",
    currentSelection: "Selección actual: {plan}, {frequency} – {price} por entrega",
  },
};

export default home;

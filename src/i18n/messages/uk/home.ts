import type { PartialMessages } from "@/i18n/messages";

/** uk – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Букети від {price}",
    allOfVienna: "Доставка по всьому Відню",
    greetingCardIncluded: "Вітальна листівка включена",
  },
  trustBarLabel: "Наші обіцянки",
  bestsellers: {
    eyebrow: "Асортимент",
    allLink: "Усі квіти",
  },
  occasions: {
    eyebrow: "Вибір за нагодою",
    allLink: "Усі нагоди",
  },
  giftFinder: {
    eyebrow: "Підбір подарунка",
    title: "Сьогодні про когось згадали?",
    text: "Три короткі запитання – і ми покажемо вам букети, які підійдуть.",
    stepsLabel: "Три запитання",
    stepRecipient: "Для кого?",
    stepOccasion: "Нагода",
    stepBudget: "Бюджет",
    cta: "Підібрати подарунок",
  },
  collections: {
    eyebrow: "Колекції",
  },
  seasonal: {
    pricePending: "Ціна згодом",
    from: "від",
  },
  howItWorks: {
    eyebrow: "Як це працює",
  },
  extras: {
    eyebrow: "Доповнення",
    allLink: "Усі доповнення",
    note: "Доповнення додаються до букета – на сторінці товару або в кошику.",
  },
  gallery: {
    eyebrow: "Галерея",
  },
  subscriptionTeaser: {
    eyebrow: "Квіткова підписка",
    from: "Від",
    perDelivery: "за доставку",
    rhythm: "Періодичність",
    imageAlt: "Сезонний букет із нашої квіткової підписки",
  },
  reviews: {
    eyebrow: "Відгуки клієнтів",
    listLabel: "Відгуки",
    quote: "«{text}»",
    verifiedPurchase: "Підтверджена покупка",
    previous: "Попередні відгуки",
    next: "Наступні відгуки",
    textLabel: "Відгук від {name}",
    demoNote: "Приклади відгуків – справжні відгуки з’являться згодом.",
  },
  faq: {
    eyebrow: "Часті питання",
    text: "Відповіді на найпоширеніші запитання про доставку, замовлення та квіти.",
    allLink: "Усі запитання та відповіді",
  },
  newsletter: {
    eyebrow: "Розсилка",
  },

  subscription: {
    title: "Квіткова підписка",
    metaTitle: "Квіткова підписка – {headline}",
    unavailable: "Квіткова підписка наразі недоступна.",
    unavailableText: "Ми працюємо над цим. А поки що в магазині ви знайдете свіжі букети для будь-якої нагоди.",
    discoverFlowers: "Переглянути квіти",
    contact: "Контакти",
    audiencesLabel: "Для кого",
    choosePlan: "Обрати підписку",
    imageAlt: "Сезонний букет із квіткової підписки",
    plansEyebrow: "Розміри підписки",
    plansTitle: "Яка підписка підійде саме вам?",
    plansText: "Ціни вказано за одну доставку, включно з доставкою в межах нашої зони доставки. Знижки залежать від періодичності.",
    howEyebrow: "Як це працює",
    howTitle: "Три кроки до першого букета.",
    steps: {
      plan: { title: "Оберіть підписку", text: "Small, Medium або Large – залежно від того, скільки місця ви хочете віддати квітам." },
      rhythm: { title: "Визначте періодичність", text: "Щотижня, раз на два тижні або щомісяця. Призупинити можна будь-коли." },
      request: { title: "Надішліть запит", text: "Ми зв’яжемося з вами з усіма подробицями та узгодимо місце доставки й дату початку." },
    },
  },

  planner: {
    checkoutError: "Оформити підписку зараз неможливо. Будь ласка, спробуйте пізніше.",
    nameRequired: "Будь ласка, введіть своє ім’я.",
    chooseRhythm: "Оберіть періодичність",
    rhythmLabel: "Періодичність доставки",
    popular: "Популярне",
    perDelivery: "/ доставка",
    discount: "Знижка {discount}%",
    selected: "Обрано",
    choosePlan: "Обрати {name}",
    requestPlan: "Запитати про {name}",
    checkoutDoneTitle: "Дякуємо – вашу квіткову підписку оформлено.",
    checkoutDoneText: "Ви отримаєте підтвердження електронною поштою. Ми зв’яжемося з вами, щоб узгодити місце доставки та дату початку.",
    checkout: "Оформити підписку",
    requestInstead: "Краще надіслати запит без зобов’язань",
    selectionSummary: "{plan}, {frequency} – {price} за доставку.",
    securePayment: "Безпечна оплата через Stripe, скасувати можна будь-коли.",
    sendRequest: "Надіслати запит",
    noObligation: "Без зобов’язань – ми зв’яжемося з вами з усіма подробицями.",
    thanksTitle: "Дякуємо за ваш запит.",
    thanksText: "Ми отримали ваш запит щодо підписки {plan} ({frequency}) і зв’яжемося з вами електронною поштою.",
    formEyebrow: "Запит",
    formTitle: "Коротко розкажіть нам, чого б вам хотілося.",
    formText: "Жодного договору, жодної оплати – ми зв’яжемося з вами з усіма подробицями та конкретною пропозицією.",
    plan: "Підписка",
    rhythm: "Періодичність",
    messagePlaceholder: "Куди доставляти квіти? Чи є побажання щодо кольорів або бажаний день?",
    currentSelection: "Поточний вибір: {plan}, {frequency} – {price} за доставку",
  },
};

export default home;

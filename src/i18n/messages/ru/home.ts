import type { PartialMessages } from "@/i18n/messages";

/** ru – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Букеты от {price}",
    allOfVienna: "Доставка по всей Вене",
    greetingCardIncluded: "Открытка включена",
  },
  trustBarLabel: "Наши обещания",
  bestsellers: {
    eyebrow: "Ассортимент",
    allLink: "Все цветы",
  },
  occasions: {
    eyebrow: "Выбор по поводу",
    allLink: "Все поводы",
  },
  giftFinder: {
    eyebrow: "Подбор подарка",
    title: "Подумали сегодня о ком-то?",
    text: "Три коротких вопроса – и мы покажем подходящие букеты.",
    stepsLabel: "Три вопроса",
    stepRecipient: "Для кого?",
    stepOccasion: "Повод",
    stepBudget: "Бюджет",
    cta: "Подобрать подарок",
  },
  collections: {
    eyebrow: "Коллекции",
  },
  seasonal: {
    pricePending: "Цена уточняется",
    from: "от",
  },
  howItWorks: {
    eyebrow: "Как это работает",
  },
  extras: {
    eyebrow: "Дополнения",
    allLink: "Все дополнения",
    note: "Дополнения добавляются к букету – на странице товара или в корзине.",
  },
  gallery: {
    eyebrow: "Галерея",
  },
  subscriptionTeaser: {
    eyebrow: "Цветочная подписка",
    from: "От",
    perDelivery: "за доставку",
    rhythm: "Периодичность",
    imageAlt: "Сезонный букет из нашей цветочной подписки",
  },
  reviews: {
    eyebrow: "Отзывы клиентов",
    listLabel: "Отзывы",
    quote: "«{text}»",
    verifiedPurchase: "Подтверждённая покупка",
    previous: "Предыдущие отзывы",
    next: "Следующие отзывы",
    textLabel: "Отзыв от {name}",
    demoNote: "Примеры отзывов – настоящие отзывы появятся позже.",
  },
  faq: {
    eyebrow: "Вопросы и ответы",
    text: "Ответы на самые частые вопросы о доставке, заказе и цветах.",
    allLink: "Все вопросы и ответы",
  },
  newsletter: {
    eyebrow: "Рассылка",
  },

  subscription: {
    title: "Цветочная подписка",
    metaTitle: "Цветочная подписка – {headline}",
    unavailable: "Цветочная подписка сейчас недоступна.",
    unavailableText: "Мы над этим работаем. А пока свежие букеты на любой повод вы найдёте в магазине.",
    discoverFlowers: "Смотреть цветы",
    contact: "Контакты",
    audiencesLabel: "Для кого",
    choosePlan: "Выбрать подписку",
    imageAlt: "Сезонный букет из цветочной подписки",
    plansEyebrow: "Размеры подписки",
    plansTitle: "Какая подписка подойдёт вам?",
    plansText: "Цены указаны за одну доставку, включая доставку в пределах нашей зоны доставки. Скидки зависят от периодичности.",
    howEyebrow: "Как это работает",
    howTitle: "Три шага до первого букета.",
    steps: {
      plan: { title: "Выберите подписку", text: "Small, Medium или Large – в зависимости от того, сколько места вы хотите отвести цветам." },
      rhythm: { title: "Задайте периодичность", text: "Еженедельно, раз в две недели или ежемесячно. Приостановить можно в любой момент." },
      request: { title: "Отправьте заявку", text: "Мы свяжемся с вами, сообщим все детали и согласуем с вами адрес доставки и дату начала." },
    },
  },

  planner: {
    checkoutError: "Оформить подписку сейчас невозможно. Пожалуйста, попробуйте позже.",
    nameRequired: "Пожалуйста, введите ваше имя.",
    chooseRhythm: "Выберите периодичность",
    rhythmLabel: "Периодичность доставки",
    popular: "Популярное",
    perDelivery: "/ доставка",
    discount: "Скидка {discount}%",
    selected: "Выбрано",
    choosePlan: "Выбрать {name}",
    requestPlan: "Запросить {name}",
    checkoutDoneTitle: "Спасибо – ваша цветочная подписка оформлена.",
    checkoutDoneText: "Вы получите подтверждение по электронной почте. Мы свяжемся с вами, чтобы согласовать адрес доставки и дату начала.",
    checkout: "Оформить подписку",
    requestInstead: "Лучше отправить заявку без обязательств",
    selectionSummary: "{plan}, {frequency} – {price} за доставку.",
    securePayment: "Безопасная оплата через Stripe, отменить можно в любой момент.",
    sendRequest: "Отправить заявку",
    noObligation: "Без обязательств – мы свяжемся с вами и сообщим все детали.",
    thanksTitle: "Спасибо за вашу заявку.",
    thanksText: "Мы получили вашу заявку на подписку {plan} ({frequency}) и свяжемся с вами по электронной почте.",
    formEyebrow: "Заявка",
    formTitle: "Расскажите коротко, чего бы вам хотелось.",
    formText: "Никакого договора, никакой оплаты – мы свяжемся с вами, сообщим все детали и сделаем конкретное предложение.",
    plan: "Подписка",
    rhythm: "Периодичность",
    messagePlaceholder: "Куда доставлять цветы? Есть ли пожелания по цвету или желаемый день?",
    currentSelection: "Текущий выбор: {plan}, {frequency} – {price} за доставку",
  },
};

export default home;

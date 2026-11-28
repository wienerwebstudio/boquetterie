import type { PartialMessages } from "@/i18n/messages";

/** ce – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Букеташ {price} дуьйна",
    allOfVienna: "Ерриге а Венахь дӀакхачор",
    greetingCardIncluded: "Декъалдаран открытка юкъахь ю",
  },
  trustBarLabel: "Тхан ваӀданаш",
  bestsellers: {
    eyebrow: "Ассортимент",
    allLink: "Массо а зезагаш",
  },
  occasions: {
    eyebrow: "Бахьане хьаьжжина харжа",
    allLink: "Дерриге бахьанаш",
  },
  giftFinder: {
    eyebrow: "СовгӀат лахар",
    title: "Тахана цхьаъ дагавеана шуна?",
    text: "Кхо доца хаттар – тӀаккха оха шуна догӀу букеташ гойтур ю.",
    stepsLabel: "Кхо хаттар",
    stepRecipient: "Хьанна?",
    stepOccasion: "Бахьана",
    stepBudget: "Бюджет",
    cta: "СовгӀат лаха",
  },
  collections: {
    eyebrow: "Коллекцеш",
  },
  seasonal: {
    pricePending: "Мах тӀаьхьа хир бу",
    from: "лаххара мах",
  },
  howItWorks: {
    eyebrow: "Иза муха болх беш ду",
  },
  extras: {
    eyebrow: "ТӀетохарш",
    allLink: "Дерриге тӀетохарш",
    note: "ТӀетохарш букетна тӀетуху – продуктан агӀонехь я корзинехь.",
  },
  gallery: {
    eyebrow: "Галерей",
  },
  subscriptionTeaser: {
    eyebrow: "Зезагийн подписка",
    from: "Лаххара мах",
    perDelivery: "цкъа дӀакхачорна",
    rhythm: "Мур",
    imageAlt: "Тхан зезагийн подпискера шеран хенан букет",
  },
  reviews: {
    eyebrow: "Клиентийн дешнаш",
    listLabel: "Отзываш",
    quote: "«{text}»",
    verifiedPurchase: "ТӀечӀагӀдина эцар",
    previous: "Хьалхара хетарш",
    next: "ТӀехьара хетарш",
    textLabel: "{name} хетар",
    demoNote: "Масален отзываш – бакъ отзываш тӀаьхьа хир ю.",
  },
  faq: {
    eyebrow: "Хаттарш",
    text: "ДӀакхачорах, заказах а, зезагех а лаьцна кест-кеста хуьлучу хаттаршна жоьпаш.",
    allLink: "Дерриге хаттарш а, жоьпаш а",
  },
  newsletter: {
    eyebrow: "Рассылка",
  },

  subscription: {
    title: "Зезагийн подписка",
    metaTitle: "Зезагийн подписка – {headline}",
    unavailable: "ХӀинца зезагийн подписка яц.",
    unavailableText: "Оха цунна тӀехь болх бо. Цул а хьалха туькахь массо а бахьанина керла букеташ карор ю шуна.",
    discoverFlowers: "Зезагашка хьажа",
    contact: "Контакт",
    audiencesLabel: "Хьанна",
    choosePlan: "Подписка харжа",
    imageAlt: "Зезагийн подпискера шеран хенан букет",
    plansEyebrow: "Подпискин бараш",
    plansTitle: "Муьлха подписка догӀу шуна?",
    plansText: "Мехаш цкъа дӀакхачорна бу, тхан дӀакхачоран зонехь дӀакхачор а юкъахь долуш. Скидкаш муьрана хьаьжжина ю.",
    howEyebrow: "Иза муха болх беш ду",
    howTitle: "Хьалхарчу букете кхо гӀулч.",
    steps: {
      plan: { title: "Подписка харжа", text: "Small, Medium я Large – зезагашна мел шорта меттиг хир ю, цунна хьаьжжина." },
      rhythm: { title: "Мур билгалбаккха", text: "КӀиранах цкъа, ши кӀиранах цкъа я беттах цкъа. Муьлххачу хенахь сацо мега." },
      request: { title: "Дехар дӀадахьийта", text: "Оха дерриге а хаамашца шуьга жоп лур ду, дӀакхачоран меттиг а, долалучу де а шуьца барт бина билгалдоккхур ду." },
    },
  },

  planner: {
    checkoutError: "ХӀинца подписка кечъян йиш яц. ТӀаьхьо юха гӀертийша.",
    nameRequired: "Шайн цӀе язъейша.",
    chooseRhythm: "Мур харжа",
    rhythmLabel: "ДӀакхачоран мур",
    popular: "Дукха оьцу",
    perDelivery: "/ дӀакхачор",
    discount: "{discount}% скидка",
    selected: "Харжина",
    choosePlan: "{name} харжа",
    requestPlan: "{name} деха",
    checkoutDoneTitle: "Баркалла – шун зезагийн подписка кечйина.",
    checkoutDoneText: "Шуна e-mail-ца тӀечӀагӀдар кхочур ду. ДӀакхачоран меттиг а, долалучу де а шуьца барт бан оха шуьга зӀе тасур ю.",
    checkout: "Подписка кечъян",
    requestInstead: "Декхар доцуш дехар дӀадахьийта",
    selectionSummary: "{plan}, {frequency} – цкъа дӀакхачорна {price}.",
    securePayment: "Stripe-ехула кхерамза мах бар, муьлххачу хенахь сацо мега.",
    sendRequest: "Дехар дӀадахьийта",
    noObligation: "Декхар доцуш – оха дерриге а хаамашца шуьга жоп лур ду.",
    thanksTitle: "Баркалла шун дехарна.",
    thanksText: "Оха шун {plan} ({frequency}) подпискин дехар схьаэцна, e-mail-ца шуьга жоп лур ду.",
    formEyebrow: "Дехар",
    formTitle: "Шуна хӀун лаьа, доццачу дийцийша.",
    formText: "Договор а, мах бар а дац – оха дерриге а хаамаш а, билгала предложени а йолуш шуьга жоп лур ду.",
    plan: "Подписка",
    rhythm: "Мур",
    messagePlaceholder: "Зезагаш мича дахьа деза? Басарийн лаамаш я лаа де дуй?",
    currentSelection: "ХӀинцалера харжам: {plan}, {frequency} – цкъа дӀакхачорна {price}",
  },
};

export default home;

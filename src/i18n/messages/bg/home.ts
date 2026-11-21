import type { PartialMessages } from "@/i18n/messages";

/** bg – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "Букети от {price}",
    allOfVienna: "Доставка в цяла Виена",
    greetingCardIncluded: "Поздравителна картичка включена",
  },
  trustBarLabel: "Нашите обещания",
  bestsellers: {
    eyebrow: "Асортимент",
    allLink: "Всички цветя",
  },
  occasions: {
    eyebrow: "Пазаруване по повод",
    allLink: "Всички поводи",
  },
  giftFinder: {
    eyebrow: "Търсачка на подаръци",
    title: "Сетихте ли се днес за някого?",
    text: "Три кратки въпроса – и ще ви покажем подходящи букети.",
    stepsLabel: "Трите въпроса",
    stepRecipient: "За кого?",
    stepOccasion: "Повод",
    stepBudget: "Бюджет",
    cta: "Намерете подарък",
  },
  collections: {
    eyebrow: "Колекции",
  },
  seasonal: {
    pricePending: "Цената предстои",
    from: "от",
  },
  howItWorks: {
    eyebrow: "Как работи",
  },
  extras: {
    eyebrow: "Допълнения",
    allLink: "Всички допълнения",
    note: "Допълненията се добавят към букет – на страницата на продукта или в количката.",
  },
  gallery: {
    eyebrow: "Галерия",
  },
  subscriptionTeaser: {
    eyebrow: "Абонамент за цветя",
    from: "От",
    perDelivery: "за доставка",
    rhythm: "Честота",
    imageAlt: "Сезонен букет от нашия абонамент за цветя",
  },
  reviews: {
    eyebrow: "Мнения на клиенти",
    listLabel: "Отзиви",
    quote: "„{text}“",
    verifiedPurchase: "Потвърдена покупка",
    previous: "Предишни отзиви",
    next: "Следващи отзиви",
    textLabel: "Отзив от {name}",
    demoNote: "Примерни отзиви – истинските отзиви предстоят.",
  },
  faq: {
    eyebrow: "Въпроси",
    text: "Отговори на най-честите въпроси за доставката, поръчката и цветята.",
    allLink: "Всички въпроси и отговори",
  },
  newsletter: {
    eyebrow: "Бюлетин",
  },

  subscription: {
    title: "Абонамент за цветя",
    metaTitle: "Абонамент за цветя – {headline}",
    unavailable: "Абонаментът за цветя в момента не е наличен.",
    unavailableText: "Работим по него. Дотогава ще намерите свежи букети за всеки повод в магазина.",
    discoverFlowers: "Разгледайте цветята",
    contact: "Контакт",
    audiencesLabel: "За кого",
    choosePlan: "Изберете абонамент",
    imageAlt: "Сезонен букет от абонамента за цветя",
    plansEyebrow: "Размери на абонамента",
    plansTitle: "Кой абонамент е подходящ за вас?",
    plansText: "Цените са за една доставка, включително доставката в нашия район на доставка. Отстъпки според честотата.",
    howEyebrow: "Как работи",
    howTitle: "Три стъпки до първия букет.",
    steps: {
      plan: { title: "Изберете абонамент", text: "Small, Medium или Large – според това колко място искате да отделите за цветята." },
      rhythm: { title: "Определете честотата", text: "Всяка седмица, на всеки две седмици или веднъж месечно. Можете да спрете временно по всяко време." },
      request: { title: "Изпратете запитване", text: "Ще се свържем с вас с всички подробности и ще уточним с вас мястото на доставка и началната дата." },
    },
  },

  planner: {
    checkoutError: "Сключването на абонамент в момента не е възможно. Моля, опитайте отново по-късно.",
    nameRequired: "Моля, въведете името си.",
    chooseRhythm: "Изберете честота",
    rhythmLabel: "Честота на доставка",
    popular: "Популярен",
    perDelivery: "/ доставка",
    discount: "{discount}% отстъпка",
    selected: "Избран",
    choosePlan: "Изберете {name}",
    requestPlan: "Запитване за {name}",
    checkoutDoneTitle: "Благодарим ви – абонаментът ви за цветя е сключен.",
    checkoutDoneText: "Ще получите потвърждение по имейл. Ще се свържем с вас, за да уточним мястото на доставка и началната дата.",
    checkout: "Сключете абонамент",
    requestInstead: "Предпочитам необвързващо запитване",
    selectionSummary: "{plan}, {frequency} – {price} за доставка.",
    securePayment: "Сигурно плащане чрез Stripe, с възможност за прекратяване по всяко време.",
    sendRequest: "Изпратете запитване",
    noObligation: "Без ангажимент – ще се свържем с вас с всички подробности.",
    thanksTitle: "Благодарим ви за запитването.",
    thanksText: "Получихме запитването ви за абонамент {plan} ({frequency}) и ще се свържем с вас по имейл.",
    formEyebrow: "Запитване",
    formTitle: "Разкажете ни накратко какво желаете.",
    formText: "Без договор, без плащане – ще се свържем с вас с всички подробности и конкретно предложение.",
    plan: "Абонамент",
    rhythm: "Честота",
    messagePlaceholder: "Къде да бъдат доставени цветята? Имате ли желания за цветове или предпочитан ден?",
    currentSelection: "Текущ избор: {plan}, {frequency} – {price} за доставка",
  },
};

export default home;

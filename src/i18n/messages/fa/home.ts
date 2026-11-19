import type { PartialMessages } from "@/i18n/messages";

/** fa – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "دسته‌گل از {price}",
    allOfVienna: "ارسال به سراسر وین",
    greetingCardIncluded: "همراه با کارت تبریک",
  },
  trustBarLabel: "تعهدات ما",
  bestsellers: {
    eyebrow: "محصولات",
    allLink: "همهٔ گل‌ها",
  },
  occasions: {
    eyebrow: "خرید بر اساس مناسبت",
    allLink: "همهٔ مناسبت‌ها",
  },
  giftFinder: {
    eyebrow: "هدیه‌یاب",
    title: "امروز به کسی فکر کرده‌اید؟",
    text: "سه پرسش کوتاه – و دسته‌گل‌هایی را که مناسب‌اند به شما نشان می‌دهیم.",
    stepsLabel: "سه پرسش",
    stepRecipient: "برای چه کسی؟",
    stepOccasion: "مناسبت",
    stepBudget: "بودجه",
    cta: "یافتن هدیه",
  },
  collections: {
    eyebrow: "مجموعه‌ها",
  },
  seasonal: {
    pricePending: "قیمت به‌زودی",
    from: "از",
  },
  howItWorks: {
    eyebrow: "روند کار",
  },
  extras: {
    eyebrow: "افزودنی‌ها",
    allLink: "همهٔ افزودنی‌ها",
    note: "افزودنی‌ها به یک دسته‌گل اضافه می‌شوند – در صفحهٔ محصول یا در سبد خرید.",
  },
  gallery: {
    eyebrow: "گالری",
  },
  subscriptionTeaser: {
    eyebrow: "اشتراک گل",
    from: "از",
    perDelivery: "برای هر ارسال",
    rhythm: "دورهٔ ارسال",
    imageAlt: "دسته‌گل فصلی از اشتراک گل ما",
  },
  reviews: {
    eyebrow: "نظر مشتریان",
    listLabel: "نظرها",
    quote: "«{text}»",
    verifiedPurchase: "خرید تأییدشده",
    demoNote: "نظرهای نمونه – نظرهای واقعی به‌زودی اضافه می‌شوند.",
  },
  faq: {
    eyebrow: "پرسش‌های متداول",
    text: "پاسخ به رایج‌ترین پرسش‌ها دربارهٔ ارسال، سفارش و گل‌ها.",
    allLink: "همهٔ پرسش‌ها و پاسخ‌ها",
  },
  newsletter: {
    eyebrow: "خبرنامه",
  },

  subscription: {
    title: "اشتراک گل",
    metaTitle: "اشتراک گل – {headline}",
    unavailable: "اشتراک گل در حال حاضر در دسترس نیست.",
    unavailableText: "در حال آماده‌سازی آن هستیم. تا آن زمان، دسته‌گل‌های تازه برای هر مناسبتی را در فروشگاه پیدا می‌کنید.",
    discoverFlowers: "دیدن گل‌ها",
    contact: "تماس",
    audiencesLabel: "برای چه کسانی",
    choosePlan: "انتخاب اشتراک",
    imageAlt: "دسته‌گل فصلی از اشتراک گل",
    plansEyebrow: "اندازه‌های اشتراک",
    plansTitle: "کدام اشتراک برای شما مناسب است؟",
    plansText: "قیمت‌ها برای هر ارسال و شامل هزینهٔ ارسال در محدودهٔ ارسال ما هستند. میزان تخفیف به دورهٔ ارسال بستگی دارد.",
    howEyebrow: "روند کار",
    howTitle: "سه قدم تا اولین دسته‌گل.",
    steps: {
      plan: { title: "انتخاب اشتراک", text: "Small، Medium یا Large – بسته به اینکه گل‌ها چقدر جا داشته باشند." },
      rhythm: { title: "تعیین دورهٔ ارسال", text: "هفتگی، هر دو هفته یک بار یا ماهانه. توقف موقت در هر زمان ممکن است." },
      request: { title: "ارسال درخواست", text: "با همهٔ جزئیات با شما در تماس خواهیم بود و محل تحویل و تاریخ شروع را با شما هماهنگ می‌کنیم." },
    },
  },

  planner: {
    checkoutError: "ثبت اشتراک در حال حاضر ممکن نیست. لطفاً بعداً دوباره امتحان کنید.",
    nameRequired: "لطفاً نام خود را وارد کنید.",
    chooseRhythm: "انتخاب دورهٔ ارسال",
    rhythmLabel: "دورهٔ ارسال",
    popular: "محبوب",
    perDelivery: "/ ارسال",
    discount: "{discount}% تخفیف",
    selected: "انتخاب‌شده",
    choosePlan: "انتخاب {name}",
    requestPlan: "درخواست {name}",
    checkoutDoneTitle: "سپاسگزاریم – اشتراک گل شما ثبت شد.",
    checkoutDoneText: "تأییدیه را از طریق ایمیل دریافت می‌کنید. برای هماهنگی محل تحویل و تاریخ شروع با شما در تماس خواهیم بود.",
    checkout: "ثبت اشتراک",
    requestInstead: "ترجیح می‌دهم بدون تعهد درخواست بدهم",
    selectionSummary: "{plan}، {frequency} – {price} برای هر ارسال.",
    securePayment: "پرداخت امن از طریق Stripe، قابل لغو در هر زمان.",
    sendRequest: "ارسال درخواست",
    noObligation: "بدون تعهد – با همهٔ جزئیات با شما در تماس خواهیم بود.",
    thanksTitle: "از درخواست شما سپاسگزاریم.",
    thanksText: "درخواست شما برای اشتراک {plan} ({frequency}) را دریافت کردیم و از طریق ایمیل با شما در تماس خواهیم بود.",
    formEyebrow: "درخواست",
    formTitle: "به‌طور خلاصه بگویید چه می‌خواهید.",
    formText: "بدون قرارداد، بدون پرداخت – با همهٔ جزئیات و یک پیشنهاد مشخص با شما در تماس خواهیم بود.",
    plan: "اشتراک",
    rhythm: "دورهٔ ارسال",
    messagePlaceholder: "گل‌ها به کجا ارسال شوند؟ رنگ دلخواه یا روز خاصی در نظر دارید؟",
    currentSelection: "انتخاب فعلی: {plan}، {frequency} – {price} برای هر ارسال",
  },
};

export default home;

import type { PartialMessages } from "@/i18n/messages";

/** ar – home (translated from src/i18n/messages/de/home.ts). */
const home: NonNullable<PartialMessages["home"]> = {
  heroFacts: {
    bouquetsFrom: "باقات ابتداءً من {price}",
    allOfVienna: "توصيل إلى جميع أنحاء فيينا",
    greetingCardIncluded: "بطاقة التهنئة مشمولة",
  },
  trustBarLabel: "وعودنا",
  bestsellers: {
    eyebrow: "التشكيلة",
    allLink: "جميع الزهور",
  },
  occasions: {
    eyebrow: "تسوّقوا حسب المناسبة",
    allLink: "جميع المناسبات",
  },
  giftFinder: {
    eyebrow: "مكتشف الهدايا",
    title: "هل خطر أحدٌ ببالكم اليوم؟",
    text: "ثلاثة أسئلة قصيرة – ونعرض عليكم باقات مناسبة.",
    stepsLabel: "الأسئلة الثلاثة",
    stepRecipient: "لمن؟",
    stepOccasion: "المناسبة",
    stepBudget: "الميزانية",
    cta: "اعثروا على هدية",
  },
  collections: {
    eyebrow: "المجموعات",
  },
  seasonal: {
    pricePending: "السعر قريبًا",
    from: "ابتداءً من",
  },
  howItWorks: {
    eyebrow: "كيف تعمل الخدمة",
  },
  extras: {
    eyebrow: "الإضافات",
    allLink: "جميع الإضافات",
    note: "تُضاف الإضافات إلى باقة – في صفحة المنتج أو في سلة التسوق.",
  },
  gallery: {
    eyebrow: "معرض الصور",
  },
  subscriptionTeaser: {
    eyebrow: "اشتراك الزهور",
    from: "ابتداءً من",
    perDelivery: "لكل توصيلة",
    rhythm: "الوتيرة",
    imageAlt: "باقة موسمية من اشتراك الزهور لدينا",
  },
  reviews: {
    eyebrow: "آراء العملاء",
    listLabel: "التقييمات",
    quote: "«{text}»",
    verifiedPurchase: "شراء موثَّق",
    demoNote: "تقييمات تجريبية – التقييمات الحقيقية ستُضاف لاحقًا.",
  },
  faq: {
    eyebrow: "الأسئلة الشائعة",
    text: "إجابات عن أكثر الأسئلة شيوعًا حول التوصيل والطلب والزهور.",
    allLink: "جميع الأسئلة والأجوبة",
  },
  newsletter: {
    eyebrow: "النشرة الإخبارية",
  },

  subscription: {
    title: "اشتراك الزهور",
    metaTitle: "اشتراك الزهور – {headline}",
    unavailable: "اشتراك الزهور غير متاح حاليًا.",
    unavailableText: "نحن نعمل على ذلك. وحتى ذلك الحين تجدون في المتجر باقات طازجة لكل مناسبة.",
    discoverFlowers: "اكتشاف الزهور",
    contact: "اتصلوا بنا",
    audiencesLabel: "لمن",
    choosePlan: "اختيار الاشتراك",
    imageAlt: "باقة موسمية من اشتراك الزهور",
    plansEyebrow: "أحجام الاشتراك",
    plansTitle: "أي اشتراك يناسبكم؟",
    plansText: "الأسعار لكل توصيلة وتشمل التوصيل داخل منطقة التوصيل لدينا. الخصومات بحسب الوتيرة.",
    howEyebrow: "كيف يعمل",
    howTitle: "ثلاث خطوات حتى الباقة الأولى.",
    steps: {
      plan: { title: "اختيار الاشتراك", text: "Small أو Medium أو Large – بحسب المساحة التي تريدون منحها للزهور." },
      rhythm: { title: "تحديد الوتيرة", text: "أسبوعيًا أو كل أسبوعين أو شهريًا. يمكن الإيقاف المؤقت في أي وقت." },
      request: { title: "إرسال الطلب", text: "نتواصل معكم بكل التفاصيل ونتفق معكم على مكان التوصيل وموعد البدء." },
    },
  },

  planner: {
    checkoutError: "لا يمكن إتمام الاشتراك حاليًا. يُرجى المحاولة لاحقًا.",
    nameRequired: "يُرجى إدخال اسمكم.",
    chooseRhythm: "اختيار الوتيرة",
    rhythmLabel: "وتيرة التوصيل",
    popular: "الأكثر طلبًا",
    perDelivery: "/ توصيلة",
    discount: "خصم {discount}%",
    selected: "تم الاختيار",
    choosePlan: "اختيار {name}",
    requestPlan: "الاستفسار عن {name}",
    checkoutDoneTitle: "شكرًا – تم إتمام اشتراك الزهور الخاص بكم.",
    checkoutDoneText: "ستصلكم رسالة تأكيد بالبريد الإلكتروني. وسنتواصل معكم للاتفاق على مكان التوصيل وموعد البدء.",
    checkout: "إتمام الاشتراك",
    requestInstead: "أفضّل الاستفسار دون التزام",
    selectionSummary: "{plan}، {frequency} – {price} لكل توصيلة.",
    securePayment: "دفع آمن عبر Stripe، ويمكن الإلغاء في أي وقت.",
    sendRequest: "إرسال الطلب",
    noObligation: "دون التزام – سنتواصل معكم بكل التفاصيل.",
    thanksTitle: "شكرًا على طلبكم.",
    thanksText: "استلمنا طلبكم للاشتراك {plan} ({frequency}) وسنتواصل معكم بالبريد الإلكتروني.",
    formEyebrow: "طلب",
    formTitle: "أخبرونا باختصار بما ترغبون فيه.",
    formText: "لا عقد ولا دفع – سنتواصل معكم بكل التفاصيل واقتراح محدد.",
    plan: "الاشتراك",
    rhythm: "الوتيرة",
    messagePlaceholder: "إلى أين ستُرسل الزهور؟ هل لديكم ألوان مفضلة أو يوم مفضل؟",
    currentSelection: "الاختيار الحالي: {plan}، {frequency} – {price} لكل توصيلة",
  },
};

export default home;

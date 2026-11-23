/**
 * E-mails to customers (German source): order confirmation, status updates,
 * withdrawal receipt, newsletter opt-in, review request, occasion reminders and
 * the login link. Server only – never sent to the browser (not in scope.tsx).
 * Internal mails (team, partner florists) stay German and are not in here.
 * Placeholders use `{name}`; `{ one, other }` objects are plurals (`{count}`).
 */
const mail = {
  /** Shared frame of every mail. */
  layout: {
    questions: "Fragen? Schreib uns an {email}.",
    hello: "Hallo {name},",
  },
  /** Order blocks: items, totals, greeting card, delivery facts. */
  order: {
    viewOrder: "Bestellung ansehen",
    size: "Größe {size}",
    color: "Farbe {color}",
    floristNote: "Dein Wunsch an die Floristik: {note}",
    rows: {
      date: "Termin",
      recipient: "Empfänger:in",
      note: "Hinweis",
      order: "Bestellung",
      status: "Status",
      delivery: "Lieferung",
    },
    totals: {
      flowers: "Blumen",
      extras: "Extras",
      delivery: "Lieferung",
      free: "kostenlos",
      coupon: "Gutschein",
      couponCode: "Gutschein {code}",
    },
    /** Price wording depends on the VAT status (see src/lib/vat.ts). */
    vat: {
      smallBusiness: {
        total: "Gesamt",
        note: "Gemäß § 6 Abs. 1 Z 27 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).",
      },
      standard: {
        total: "Gesamt (inkl. USt.)",
        note: "Alle Preise inkl. USt.",
      },
    },
    greeting: {
      title: "Deine Grußkarte",
      noSender: "ohne Absender",
      sender: "Absender {name}",
      /** "{sender}" is `noSender` or `sender`. */
      line: "Grußkarte: {sender}",
      /** The card text in the plain-text mail, in quotation marks. */
      quote: "„{text}“",
    },
  },
  orderConfirmation: {
    subject: "Deine Bestellung {id} bei {brand}",
    /** "{delivery}" is e.g. "Freitag, 12. September 2026, 9–12 Uhr". */
    preheader: "Lieferung am {delivery}.",
    headline: "Danke für deine Bestellung.",
    intro: "wir haben deine Bestellung {id} erhalten. Der Strauß wird für deine Bestellung von Hand gebunden und am gewählten Liefertag per Kurier zugestellt.",
    deliveryTitle: "Lieferung",
    itemsTitle: "Deine Blumen",
    outro: "Den aktuellen Stand deiner Bestellung siehst du jederzeit über den Link oben. Wenn sich etwas ändert, melden wir uns per E-Mail.",
    footer: "Du erhältst diese E-Mail, weil du bei uns bestellt hast.",
  },
  orderStatus: {
    /** "{status}" is the status name, e.g. "Unterwegs". */
    subject: "{status} – Bestellung {id}",
    reachUs: "Erreichbar sind wir unter {email}.",
    footer: "Du erhältst diese E-Mail, weil sich der Status deiner Bestellung geändert hat.",
    statuses: {
      received: { headline: "Deine Bestellung ist eingegangen.", text: "Wir haben alles erhalten und kümmern uns darum." },
      paid: { headline: "Zahlung bestätigt.", text: "Deine Zahlung ist bei uns eingegangen. Danke." },
      preparing: { headline: "Wir bereiten deinen Strauß vor.", text: "Die Blumen für deine Bestellung werden gerade ausgewählt." },
      arranging: { headline: "Dein Strauß wird gebunden.", text: "Dein Strauß wird gerade von Hand gebunden." },
      ready: { headline: "Bereit zur Lieferung.", text: "Der Strauß ist fertig. Ein Kurier holt ihn ab und bringt ihn zur Empfängeradresse." },
      in_transit: { headline: "Dein Strauß ist unterwegs.", text: "Ein Kurier ist mit den Blumen auf dem Weg zur Empfängeradresse." },
      delivered: { headline: "Zugestellt.", text: "Die Blumen sind angekommen. Wir hoffen, sie machen Freude." },
      undeliverable: { headline: "Wir konnten leider nicht zustellen.", text: "Bei der Zustellung hat es nicht geklappt. Wir melden uns so bald wie möglich bei dir, um einen neuen Versuch abzustimmen." },
      cancelled: { headline: "Deine Bestellung wurde storniert.", text: "Die Bestellung ist storniert. Falls du dazu Fragen hast oder das nicht deine Absicht war, antworte einfach auf diese E-Mail." },
    },
  },
  withdrawal: {
    subject: "Eingangsbestätigung deines Widerrufs – Bestellung {orderId}",
    preheader: "Wir haben deinen Widerruf am {receivedAt} erhalten.",
    headline: "Dein Widerruf ist eingegangen.",
    intro: "wir bestätigen den Eingang deiner Widerrufserklärung, die du über die Funktion „Vertrag widerrufen“ auf unserer Website abgegeben hast:",
    rows: {
      receivedAt: "Eingegangen am",
      orderId: "Bestellnummer",
      items: "Widerrufen",
      id: "Vorgangsnummer",
    },
    allItems: "alle widerrufbaren Waren dieser Bestellung",
    legal: "Für frische Schnittblumen und andere schnell verderbliche Waren besteht nach § 18 Abs. 1 Z 4 FAGG kein Widerrufsrecht. Wir prüfen deine Erklärung und melden uns zur Rückabwicklung per E-Mail.",
    policyLink: "Widerrufsbelehrung ansehen",
    footer: "Diese E-Mail bestätigt nur den Eingang deiner Erklärung.",
  },
  newsletter: {
    subject: "Bitte bestätige deine Anmeldung zum {brand}-Newsletter",
    preheader: "Ein Klick, dann bist du dabei.",
    headline: "Fast geschafft.",
    intro: "Du – oder jemand mit deiner E-Mail-Adresse – möchtest den Newsletter von {brand} bekommen. Bitte bestätige das mit einem Klick:",
    confirm: "Anmeldung bestätigen",
    ignore: "Ohne Bestätigung schicken wir dir keinen Newsletter. Warst du das nicht, kannst du diese E-Mail einfach ignorieren.",
    unsubscribe: "Adresse wieder löschen",
    footer: "Du erhältst diese E-Mail, weil deine Adresse für unseren Newsletter angemeldet wurde.",
  },
  reviewRequest: {
    subject: "Wie war der Strauß? – Bestellung {id}",
    preheader: "Zwei Minuten, die uns sehr helfen.",
    headline: "Wie hat es gefallen?",
    /** "{product}" is `product` (with the bouquet's name) or `productFallback`. */
    intro: "vor Kurzem wurde {product} zugestellt. Wir würden gern wissen, wie die Blumen angekommen sind – und was wir besser machen können.",
    product: "„{name}“",
    productFallback: "dein Strauß",
    photos: "Ein Foto vom Strauß freut uns besonders – du kannst bis zu drei Bilder mitschicken.",
    cta: "Bewertung schreiben",
    note: "Das dauert nur einen Moment. Deine Bewertung wird von uns gelesen und erst danach im Shop veröffentlicht.",
    footer: "Du erhältst diese E-Mail einmalig, weil du bei uns bestellt hast.",
  },
  reminders: {
    /** "Muttertag von Mama" – occasion and the person it is about. */
    occasionWithPerson: "{occasion} von {person}",
    confirmation: {
      /** "{what}" is the occasion, optionally with the person ("Geburtstag von Anna"). */
      subject: "Bitte bestätige deine Erinnerung: {what}",
      preheader: "Ein Klick, und die Erinnerung ist aktiv.",
      headline: "Fast fertig.",
      /** "{date}" is day and month ("12. März"), "{daysBefore}" is `daysBefore`. */
      intro: "Du möchtest an {what} erinnert werden – am {date}, {daysBefore}. Bitte bestätige das mit einem Klick:",
      daysBefore: { one: "{count} Tag vorher", other: "{count} Tage vorher" },
      cta: "Erinnerung bestätigen",
      ignore: "Falls du das nicht warst, kannst du diese E-Mail einfach ignorieren. Ohne Bestätigung senden wir nichts.",
      footer: "Die Erinnerung wurde auf unserer Website angelegt.",
    },
    reminder: {
      /** "{when}" is `tomorrow` or `inDays`. */
      subject: "{what} ist {when}",
      headline: "{what} ist {when}.",
      tomorrow: "morgen",
      inDays: { one: "in {count} Tag", other: "in {count} Tagen" },
      preheader: "Am {date}. Eine kleine Erinnerung.",
      text: "Kleine Erinnerung: Am {date} ist {what}. Wenn du Blumen schicken möchtest, ist jetzt ein guter Moment. Du wählst das Wunschdatum, der Strauß wird für deine Bestellung von Hand gebunden.",
      occasionCta: "Blumen zu {occasion}",
      allBouquets: "Alle Sträuße ansehen",
      bouquets: "Sträuße ansehen",
      footer: "Du erhältst diese E-Mail, weil du auf unserer Website eine Erinnerung angelegt hast.",
      unsubscribe: "Erinnerung löschen: {url}",
    },
  },
  /** Login link of the shared template (src/lib/mail/templates.ts → magicLink). */
  magicLink: {
    subject: "Dein Anmeldelink für {brand}",
    preheader: "Der Link ist {minutes} Minuten gültig.",
    headline: "Hier ist dein Anmeldelink.",
    intro: "Mit einem Klick bist du angemeldet – kein Passwort nötig.",
    cta: "Jetzt anmelden",
    note: "Der Link ist {minutes} Minuten gültig und funktioniert nur einmal. Wenn du keine Anmeldung angefordert hast, ignoriere diese E-Mail einfach.",
  },
  /** Login link of the customer account (src/lib/auth/mail.ts – the one /api/auth/request-link sends). */
  loginLink: {
    subject: "Dein Login-Link für {brand}",
    eyebrow: "Anmelden ohne Passwort",
    title: "Dein Login-Link",
    intro: "Mit einem Klick bist du in deinem Konto bei {brand} angemeldet. Der Link ist {minutes} Minuten gültig und funktioniert nur einmal.",
    cta: "Jetzt anmelden",
    fallback: "Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:",
    ignore: "Du hast keinen Login angefordert? Dann kannst du diese E-Mail einfach ignorieren – ohne den Link passiert nichts.",
    textIntro: "Mit diesem Link bist du in deinem Konto angemeldet. Er ist {minutes} Minuten gültig und funktioniert nur einmal:",
    textIgnore: "Du hast keinen Login angefordert? Dann kannst du diese E-Mail einfach ignorieren.",
  },
  /** Individual offer (admin → Angebote): the mail with the payment link. */
  offer: {
    subject: "Dein persönliches Angebot von {brand}",
    preheader: "{total} inkl. Lieferung – gültig bis {date}.",
    headline: "Dein persönliches Angebot",
    intro: "Danke für deine Anfrage. Hier ist unser Angebot für dich – der Preis enthält die Lieferung.",
    pay: "Jetzt bezahlen",
    valid: "Gültig bis {date}. Nach der Zahlung bekommst du sofort eine Bestellbestätigung.",
    place: "Lieferort",
    fallback: "Falls der Button nicht funktioniert: {url}",
    footer: "Du bekommst diese E-Mail, weil du bei uns ein Angebot angefragt hast.",
    byArrangement: "Nach Absprache",
    confirmed: "Danke für deine Zahlung – deine Bestellung {id} zu deinem persönlichen Angebot ist bestätigt. Wir kümmern uns um alles Weitere und melden uns, falls noch etwas offen ist.",
  },
  /** Request from the page /anfrage: confirmation to the customer (never promises an offer or a response time). */
  customRequest: {
    subject: "Deine Anfrage bei {brand} ({id})",
    preheader: "Danke – wir melden uns in Kürze.",
    headline: "Danke für deine Anfrage",
    intro: "Wir haben deine Anfrage erhalten und melden uns in Kürze bei dir.",
    summary: "Deine Angaben",
    rows: {
      id: "Anfrage-Nr.",
      topics: "Worum geht es?",
      product: "Strauß",
      date: "Wunschtermin",
      place: "Lieferort",
      budget: "Budget",
      message: "Deine Nachricht",
      photo: "Foto",
    },
    photoReceived: "1 Foto erhalten",
    flexible: "flexibel",
    footer: "Du bekommst diese E-Mail, weil du auf {brand} eine Anfrage geschickt hast.",
  },
};

export default mail;

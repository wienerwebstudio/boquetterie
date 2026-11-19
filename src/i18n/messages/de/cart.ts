/** UI texts – cart (German source). */
const cart = {
  metaTitle: "Warenkorb",
  metaDescription: "Deine ausgewählten Sträuße und Extras – bereit für die Lieferung in Wien.",
  title: "Warenkorb",
  eyebrow: "Fast geschafft",
  loading: "Warenkorb wird geladen",
  itemsHeading: "Artikel im Warenkorb",
  /** Item count, e.g. "3 Artikel". */
  items: { one: "{count} Artikel", other: "{count} Artikel" },
  /** Screen-reader announcement, e.g. "Warenkorb: 3 Artikel". */
  liveCount: "Warenkorb: {count}",
  continueShopping: "Weiter einkaufen",
  summaryTitle: "Zusammenfassung",
  checkout: "Sicher zur Kasse",
  trust: {
    securePayment: "Sichere Zahlung",
    ssl: "SSL-verschlüsselt",
    privacy: "Datenschutz",
  },
  empty: {
    eyebrow: "Dein Warenkorb",
    title: "Noch ganz leer.",
    textWithCards: "Frisch gebundene Sträuße, Wunschdatum und eine persönliche Karte – alles wartet nur auf dich.",
    text: "Frisch gebundene Sträuße und dein Wunschdatum – alles wartet nur auf dich.",
    cta: "Blumen entdecken",
  },
  drawer: {
    total: "Gesamt",
    /** "{vat}" is the short price label (e.g. "Endpreis"). */
    inclDelivery: "{vat} inkl. Lieferung",
    plusDelivery: "{vat} · zzgl. Lieferung",
  },
  /** Price wording depends on the VAT status (see src/lib/vat.ts). */
  vat: {
    smallBusiness: {
      short: "Endpreis",
      note: "Gemäß § 6 Abs. 1 Z 27 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).",
    },
    standard: {
      short: "inkl. USt.",
      note: "Alle Preise inkl. USt.",
    },
  },
  line: {
    color: "Farbe {color}",
    wish: "Wunsch: {note}",
    delivery: "Lieferung",
    chooseDateInCheckout: "Lieferdatum im Checkout wählen",
    anonymous: "Ohne Absender",
    extras: "Extras",
    extraLess: "{name}: eins weniger",
    extraMore: "{name}: eins mehr",
    removeExtra: "{name} entfernen",
    quantity: "Anzahl {name}",
    decrease: "Anzahl verringern",
    increase: "Anzahl erhöhen",
    remove: "Entfernen",
  },
  summary: {
    bouquets: "Sträuße",
    extras: "Extras",
    delivery: "Lieferung",
    free: "Gratis",
    deliveryInCheckout: "wird im Checkout berechnet",
    discount: "Rabatt",
    total: "Gesamt",
    /** "{amount}" is wrapped in bold. */
    missingForFreeDelivery: "Noch {amount} bis zur kostenlosen Lieferung.",
    minOrder: "Für diese Adresse gilt ein Mindestbestellwert von {amount}.",
    removeCoupon: "Gutschein entfernen",
    couponCode: "Gutscheincode",
    redeem: "Einlösen",
    couponQuestion: "Gutscheincode?",
    couponCheckFailed: "Der Gutschein konnte gerade nicht geprüft werden. Bitte versuch es gleich noch einmal.",
    couponMissing: "Bitte gib einen Gutscheincode ein.",
    couponUnknown: "Dieser Code ist uns nicht bekannt.",
  },
  surprise: {
    title: "Deine Überraschung",
    bouquet: "Strauß",
    card: "+ Karte",
    extras: "+ Extras",
    cardsSoon: "Grußkarten kommen bald",
    cardIncluded: "Grußkarte inklusive – Nachricht jederzeit ergänzbar",
    noExtras: "Noch keine Extras",
  },
  upsell: {
    title: "Noch etwas dazu?",
    subtitle: "Kommt mit dem Strauß",
    add: "Hinzufügen",
    addAria: "{name} für {price} hinzufügen",
  },
  cardPreview: {
    label: "Vorschau der Grußkarte",
    placeholder: "Deine Nachricht erscheint hier.",
    anonymous: "Ohne Absender",
  },
};
export default cart;

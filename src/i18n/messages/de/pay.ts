/**
 * Payment in one step (Stripe Payment Element inline in the checkout and on offer pages)
 * and the express purchase with Apple Pay / Google Pay / Link (product page, cart).
 * Sent to every page (src/i18n/scope.tsx) – keep it small.
 */
const pay = {
  inline: {
    loading: "Zahlungsfeld wird geladen …",
    loadFailed: "Das Zahlungsfeld konnte nicht geladen werden. Bitte lade die Seite neu, versuch einen anderen Browser oder wähle eine andere Zahlungsart. Es wurde nichts abgebucht.",
    /** "{method}" is Klarna or EPS. */
    redirectHint: "Nach „Jetzt kaufen“ bestätigst du die Zahlung bei {method}.",
    /** "{method}" is Apple Pay or Google Pay. */
    walletHint: "Nach „Jetzt kaufen“ bestätigst du die Zahlung mit {method}.",
    /** "{total}" is the new amount. */
    amountChanged: "Der Gesamtbetrag beträgt jetzt {total} (z. B. wegen Liefergebühr oder Gutschein). Bitte prüfe ihn und tippe noch einmal auf den Button – es wurde nichts abgebucht.",
    /** "{reason}" is Stripe's message, "{orderId}" the order number. */
    failed: "Die Zahlung hat nicht geklappt: {reason} Deine Bestellung {orderId} ist gespeichert, aber noch nicht bezahlt – versuch es gleich noch einmal oder wähle eine andere Zahlungsart.",
    retry: "Bitte gib deine Zahlungsdaten noch einmal ein und tippe erneut auf den Button.",
  },
  express: {
    title: "Express-Kauf",
    intro: "Direkt mit Apple Pay, Google Pay oder Link bestellen – Lieferadresse und Kontaktdaten kommen aus deiner Wallet.",
    postalCode: "PLZ des Empfängers",
    date: "Liefertag",
    window: "Zeitfenster",
    choose: "Bitte wählen",
    needPostalCode: "Bitte gib zuerst die PLZ des Empfängers ein.",
    needSlot: "Bitte wähle zuerst Liefertag und Zeitfenster.",
    noDays: "Für diese Postleitzahl ist gerade kein Liefertag frei.",
    errors: {
      zone: "An diese Postleitzahl liefern wir leider nicht. Bitte wähle eine Adresse in unserem Liefergebiet.",
      date: "Der gewählte Liefertag ist für diese Adresse nicht verfügbar. Bitte wähle einen anderen Tag.",
      window: "Das gewählte Zeitfenster ist für diese Adresse nicht verfügbar. Bitte wähle ein anderes.",
      minOrder: "Für dieses Liefergebiet gilt ein Mindestbestellwert – bitte geh zur Kasse.",
      items: "Ein Artikel ist gerade nicht verfügbar. Bitte prüfe deinen Warenkorb.",
      coupon: "Der Gutschein ist nicht gültig. Bitte entferne ihn oder geh zur Kasse.",
      address: "Bitte wähle in deiner Wallet eine vollständige Lieferadresse mit Hausnummer, eine E-Mail-Adresse und eine Telefonnummer.",
      amountChanged: "Der Betrag hat sich gerade geändert. Bitte starte den Express-Kauf noch einmal – es wurde nichts abgebucht.",
      failed: "Die Express-Zahlung hat nicht geklappt. Es wurde nichts abgebucht – versuch es noch einmal oder geh zur Kasse.",
      connection: "Keine Verbindung. Bitte prüfe deine Internetverbindung und versuch es noch einmal.",
    },
    goods: "Blumen & Extras",
    /** Shipping rate in the wallet sheet. */
    shipping: "Lieferung am {date}",
    shippingWindow: "Lieferung am {date}, {window}",
    /** One line under the wallet button: "{wallet}" is Apple Pay / Google Pay / Link, "{terms}" and "{withdrawal}" are links. */
    legal: "Mit {wallet} bestellst du zahlungspflichtig · {terms} · {withdrawal}",
    terms: "AGB",
    withdrawal: "Widerruf",
    /** Title of the withdrawal link (cut flowers are excluded from the right of withdrawal). */
    withdrawalNote: "Für frische Schnittblumen besteht kein Widerrufsrecht.",
  },
};

export default pay;

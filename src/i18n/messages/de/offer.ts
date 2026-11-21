/**
 * Individual offer page `/angebot/[token]` (admin → Angebote, see docs/OFFERS.md).
 * Few, short strings; payment texts (methods, Stripe form, terms) come from `checkout`.
 */
const offer = {
  metaTitle: "Dein Angebot",
  eyebrow: "Persönliches Angebot {id}",
  title: "Dein persönliches Angebot",
  intro: "Hallo {name}, hier ist dein Angebot. Prüfe alles in Ruhe und bezahle sicher online.",
  items: "Deine Blumen",
  delivery: "Lieferung",
  date: "Termin",
  place: "Lieferort",
  recipient: "Empfänger:in",
  card: "Grußkarte",
  flowers: "Blumen",
  extras: "Extras",
  deliveryFee: "Lieferung",
  free: "kostenlos",
  validUntil: "Gültig bis {date}",
  payTitle: "Bezahlung",
  pay: "Jetzt bezahlen · {total}",
  acceptTerms: "Ich habe die {terms} und die {withdrawal} gelesen.",
  acceptTermsError: "Bitte bestätige die AGB.",
  paidTitle: "Danke – bereits bezahlt",
  paidText: "Dieses Angebot ist bezahlt. Deine Bestellbestätigung hast du per E-Mail bekommen.",
  viewOrder: "Bestellung ansehen",
  expiredTitle: "Angebot abgelaufen",
  expiredText: "Dieses Angebot ist nicht mehr gültig. Schreib uns gern – wir erstellen dir ein neues.",
  cancelledTitle: "Angebot nicht mehr verfügbar",
  cancelledText: "Dieses Angebot wurde zurückgezogen. Bei Fragen schreib uns gern.",
  cancelledPayment: "Die Zahlung wurde nicht abgeschlossen. Du kannst es noch einmal versuchen.",
  failed: "Die Zahlung konnte nicht gestartet werden. Bitte versuch es noch einmal.",
  byArrangement: "Nach Absprache",
  previewTitle: "Vorschau – noch nicht versendet",
  previewText: "Dieses Angebot ist noch ein Entwurf. So sieht es die Kundin oder der Kunde. Bezahlen ist erst möglich, nachdem ihr es gesendet oder den Link kopiert habt.",
};

export default offer;

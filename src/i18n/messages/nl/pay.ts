import type { PartialMessages } from "@/i18n/messages";

/** nl – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Betaalveld wordt geladen …",
    loadFailed: "Het betaalveld kon niet worden geladen. Laad de pagina opnieuw, probeer een andere browser of kies een andere betaalmethode. Er is niets afgeschreven.",
    redirectHint: "Na „Nu kopen” bevestig je de betaling bij {method}.",
    walletHint: "Na „Nu kopen” bevestig je de betaling met {method}.",
    amountChanged: "Het totaalbedrag is nu {total} (bijv. door bezorgkosten of een kortingscode). Controleer het en tik nog een keer op de knop – er is niets afgeschreven.",
    failed: "De betaling is niet gelukt: {reason} Je bestelling {orderId} is opgeslagen, maar nog niet betaald – probeer het meteen nog een keer of kies een andere betaalmethode.",
    retry: "Voer je betaalgegevens nog een keer in en tik opnieuw op de knop.",
  },
  express: {
    title: "Express afrekenen",
    intro: "Direct bestellen met Apple Pay, Google Pay of Link – bezorgadres en contactgegevens komen uit je wallet.",
    postalCode: "Postcode van de ontvanger",
    date: "Bezorgdag",
    window: "Tijdvak",
    choose: "Maak een keuze",
    needPostalCode: "Voer eerst de postcode van de ontvanger in.",
    needSlot: "Kies eerst een bezorgdag en een tijdvak.",
    noDays: "Voor deze postcode is op dit moment geen bezorgdag beschikbaar.",
    errors: {
      zone: "Op deze postcode bezorgen we helaas niet. Kies een adres in ons bezorggebied.",
      date: "De gekozen bezorgdag is voor dit adres niet beschikbaar. Kies een andere dag.",
      window: "Het gekozen tijdvak is voor dit adres niet beschikbaar. Kies een ander tijdvak.",
      minOrder: "Voor dit bezorggebied geldt een minimaal bestelbedrag – ga naar de kassa.",
      items: "Een artikel is op dit moment niet beschikbaar. Controleer je winkelmandje.",
      coupon: "De kortingscode is niet geldig. Verwijder hem of ga naar de kassa.",
      address: "Kies in je wallet een volledig bezorgadres met huisnummer, een e-mailadres en een telefoonnummer.",
      amountChanged: "Het bedrag is net gewijzigd. Start express afrekenen nog een keer – er is niets afgeschreven.",
      failed: "De express-betaling is niet gelukt. Er is niets afgeschreven – probeer het nog een keer of ga naar de kassa.",
      connection: "Geen verbinding. Controleer je internetverbinding en probeer het nog een keer.",
    },
    goods: "Bloemen & extra's",
    shipping: "Bezorging op {date}",
    shippingWindow: "Bezorging op {date}, {window}",
    legal: "Met {wallet} plaats je een bestelling met betalingsverplichting · {terms} · {withdrawal}",
    terms: "Voorwaarden",
    withdrawal: "Herroeping",
    withdrawalNote: "Voor verse snijbloemen geldt geen herroepingsrecht.",
  },
};

export default pay;

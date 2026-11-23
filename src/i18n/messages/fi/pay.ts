import type { PartialMessages } from "@/i18n/messages";

/** fi – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Maksukenttää ladataan …",
    loadFailed: "Maksukenttää ei voitu ladata. Lataa sivu uudelleen, kokeile toista selainta tai valitse toinen maksutapa. Mitään ei veloitettu.",
    redirectHint: "Painettuasi ”Osta nyt” vahvistat maksun palvelussa {method}.",
    walletHint: "Painettuasi ”Osta nyt” vahvistat maksun palvelulla {method}.",
    amountChanged: "Kokonaissumma on nyt {total} (esim. toimitusmaksun tai alennuskoodin vuoksi). Tarkista se ja napauta painiketta uudelleen – mitään ei veloitettu.",
    failed: "Maksu ei onnistunut: {reason} Tilauksesi {orderId} on tallennettu, mutta sitä ei ole vielä maksettu – yritä heti uudelleen tai valitse toinen maksutapa.",
    retry: "Anna maksutietosi uudelleen ja napauta painiketta uudelleen.",
  },
  express: {
    title: "Pikaosto",
    intro: "Tilaa suoraan Apple Paylla, Google Paylla tai Linkillä – toimitusosoite ja yhteystiedot tulevat lompakostasi.",
    postalCode: "Vastaanottajan postinumero",
    date: "Toimituspäivä",
    window: "Aikaikkuna",
    choose: "Valitse",
    needPostalCode: "Anna ensin vastaanottajan postinumero.",
    needSlot: "Valitse ensin toimituspäivä ja aikaikkuna.",
    noDays: "Tälle postinumerolle ei ole juuri nyt vapaita toimituspäiviä.",
    errors: {
      zone: "Valitettavasti emme toimita tähän postinumeroon. Valitse osoite toimitusalueeltamme.",
      date: "Valittu toimituspäivä ei ole käytettävissä tähän osoitteeseen. Valitse toinen päivä.",
      window: "Valittu aikaikkuna ei ole käytettävissä tähän osoitteeseen. Valitse toinen.",
      minOrder: "Tällä toimitusalueella on vähimmäistilausarvo – siirry kassalle.",
      items: "Jokin tuote ei ole juuri nyt saatavilla. Tarkista ostoskorisi.",
      coupon: "Alennuskoodi ei ole voimassa. Poista se tai siirry kassalle.",
      address: "Valitse lompakostasi täydellinen toimitusosoite talonnumeroineen, sähköpostiosoite ja puhelinnumero.",
      amountChanged: "Summa muuttui juuri. Aloita pikaosto uudelleen – mitään ei veloitettu.",
      failed: "Pikamaksu ei onnistunut. Mitään ei veloitettu – yritä uudelleen tai siirry kassalle.",
      connection: "Ei yhteyttä. Tarkista internetyhteytesi ja yritä uudelleen.",
    },
    goods: "Kukat ja lisät",
    shipping: "Toimitus {date}",
    shippingWindow: "Toimitus {date}, {window}",
    legal: "Tilaat maksullisesti palvelulla {wallet} · {terms} · {withdrawal}",
    terms: "Sopimusehdot",
    withdrawal: "Peruutus",
    withdrawalNote: "Tuoreilla leikkokukilla ei ole peruutusoikeutta.",
  },
};

export default pay;

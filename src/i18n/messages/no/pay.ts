import type { PartialMessages } from "@/i18n/messages";

/** no – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Betalingsfeltet lastes inn …",
    loadFailed: "Betalingsfeltet kunne ikke lastes. Last inn siden på nytt, prøv en annen nettleser eller velg en annen betalingsmåte. Ingenting er trukket.",
    redirectHint: "Etter «Kjøp nå» bekrefter du betalingen hos {method}.",
    walletHint: "Etter «Kjøp nå» bekrefter du betalingen med {method}.",
    amountChanged: "Totalbeløpet er nå {total} (f.eks. på grunn av leveringsgebyr eller rabattkode). Sjekk det og trykk på knappen en gang til – ingenting er trukket.",
    failed: "Betalingen gikk ikke gjennom: {reason} Bestillingen din {orderId} er lagret, men ikke betalt ennå – prøv igjen med en gang eller velg en annen betalingsmåte.",
    retry: "Skriv inn betalingsopplysningene dine på nytt og trykk på knappen igjen.",
  },
  express: {
    title: "Ekspresskjøp",
    intro: "Bestill direkte med Apple Pay, Google Pay eller Link – leveringsadresse og kontaktopplysninger hentes fra lommeboken din.",
    postalCode: "Mottakerens postnummer",
    date: "Leveringsdag",
    window: "Tidsvindu",
    choose: "Velg",
    needPostalCode: "Skriv først inn mottakerens postnummer.",
    needSlot: "Velg først leveringsdag og tidsvindu.",
    noDays: "For dette postnummeret er ingen leveringsdag ledig akkurat nå.",
    errors: {
      zone: "Til dette postnummeret leverer vi dessverre ikke. Velg en adresse i leveringsområdet vårt.",
      date: "Den valgte leveringsdagen er ikke tilgjengelig for denne adressen. Velg en annen dag.",
      window: "Det valgte tidsvinduet er ikke tilgjengelig for denne adressen. Velg et annet.",
      minOrder: "For dette leveringsområdet gjelder en minste ordreverdi – gå til kassen.",
      items: "En vare er ikke tilgjengelig akkurat nå. Sjekk handlekurven din.",
      coupon: "Rabattkoden er ikke gyldig. Fjern den eller gå til kassen.",
      address: "Velg en fullstendig leveringsadresse med husnummer, en e-postadresse og et telefonnummer i lommeboken din.",
      amountChanged: "Beløpet har nettopp endret seg. Start ekspresskjøpet på nytt – ingenting er trukket.",
      failed: "Ekspressbetalingen gikk ikke gjennom. Ingenting er trukket – prøv igjen eller gå til kassen.",
      connection: "Ingen forbindelse. Sjekk internettforbindelsen din og prøv igjen.",
    },
    goods: "Blomster og ekstra",
    shipping: "Levering {date}",
    shippingWindow: "Levering {date}, {window}",
    legal: "Med {wallet} legger du inn en bindende bestilling · {terms} · {withdrawal}",
    terms: "Vilkår",
    withdrawal: "Angrerett",
    withdrawalNote: "For friske snittblomster gjelder ingen angrerett.",
  },
};

export default pay;

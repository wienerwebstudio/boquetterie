import type { PartialMessages } from "@/i18n/messages";

/** ro – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Se încarcă câmpul de plată …",
    loadFailed: "Câmpul de plată nu a putut fi încărcat. Te rugăm să reîncarci pagina, să încerci alt browser sau să alegi altă metodă de plată. Nu s-a debitat nimic.",
    redirectHint: "După „Cumpără acum” confirmi plata la {method}.",
    walletHint: "După „Cumpără acum” confirmi plata cu {method}.",
    amountChanged: "Totalul este acum {total} (de ex. din cauza taxei de livrare sau a unui voucher). Te rugăm să îl verifici și să atingi din nou butonul – nu s-a debitat nimic.",
    failed: "Plata nu a reușit: {reason} Comanda ta {orderId} este salvată, dar încă neplătită – încearcă din nou imediat sau alege altă metodă de plată.",
    retry: "Te rugăm să introduci din nou datele de plată și să atingi încă o dată butonul.",
  },
  express: {
    title: "Cumpărare expresă",
    /** Divider between the checkout button and the wallet buttons in the cart. */
    intro: "Comandă direct cu Apple Pay, Google Pay sau Link – adresa de livrare și datele de contact vin din portofelul tău.",
    postalCode: "Codul poștal al destinatarului",
    date: "Ziua livrării",
    window: "Interval orar",
    choose: "Te rugăm să alegi",
    needPostalCode: "Te rugăm să introduci mai întâi codul poștal al destinatarului.",
    needSlot: "Te rugăm să alegi mai întâi ziua livrării și intervalul orar.",
    noDays: "Pentru acest cod poștal nu există momentan nicio zi de livrare liberă.",
    errors: {
      zone: "Din păcate nu livrăm la acest cod poștal. Te rugăm să alegi o adresă din zona noastră de livrare.",
      date: "Ziua de livrare aleasă nu este disponibilă pentru această adresă. Te rugăm să alegi altă zi.",
      window: "Intervalul orar ales nu este disponibil pentru această adresă. Te rugăm să alegi altul.",
      minOrder: "Pentru această zonă de livrare se aplică o valoare minimă a comenzii – te rugăm să mergi la casă.",
      items: "Un produs nu este disponibil momentan. Te rugăm să verifici coșul.",
      coupon: "Voucherul nu este valabil. Te rugăm să îl elimini sau să mergi la casă.",
      address: "Te rugăm să alegi în portofel o adresă de livrare completă cu număr, o adresă de e-mail și un număr de telefon.",
      amountChanged: "Suma tocmai s-a schimbat. Te rugăm să pornești din nou cumpărarea expresă – nu s-a debitat nimic.",
      failed: "Plata expresă nu a reușit. Nu s-a debitat nimic – încearcă din nou sau mergi la casă.",
      connection: "Nicio conexiune. Te rugăm să verifici conexiunea la internet și să încerci din nou.",
    },
    goods: "Flori și extra",
    shipping: "Livrare pe {date}",
    shippingWindow: "Livrare pe {date}, {window}",
    legal: "Cu {wallet} plasezi o comandă cu obligație de plată · {terms} · {withdrawal}",
    terms: "Termeni",
    withdrawal: "Retragere",
    withdrawalNote: "Pentru flori tăiate proaspete nu există drept de retragere.",
  },
};

export default pay;

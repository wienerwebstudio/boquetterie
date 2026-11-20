import type { PartialMessages } from "@/i18n/messages";

/** hu – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Az ajánlatod",
  eyebrow: "Személyes ajánlat {id}",
  title: "A személyes ajánlatod",
  intro: "Kedves {name}! Itt az ajánlatod. Nézz át mindent nyugodtan, és fizess biztonságosan online.",
  items: "A virágaid",
  delivery: "Szállítás",
  date: "Időpont",
  place: "Szállítási hely",
  recipient: "Címzett",
  card: "Üdvözlőkártya",
  flowers: "Virágok",
  extras: "Extrák",
  deliveryFee: "Szállítás",
  free: "ingyenes",
  validUntil: "Érvényes eddig: {date}",
  payTitle: "Fizetés",
  pay: "Fizetés most · {total}",
  acceptTerms: "Elolvastam az {terms} és az {withdrawal}.",
  acceptTermsError: "Kérjük, fogadd el az ÁSZF-et.",
  paidTitle: "Köszönjük – már kifizetve",
  paidText: "Ez az ajánlat ki van fizetve. A rendelés visszaigazolását e-mailben megkaptad.",
  viewOrder: "Rendelés megtekintése",
  expiredTitle: "Az ajánlat lejárt",
  expiredText: "Ez az ajánlat már nem érvényes. Írj nekünk – szívesen készítünk újat.",
  cancelledTitle: "Az ajánlat már nem elérhető",
  cancelledText: "Ezt az ajánlatot visszavontuk. Kérdés esetén írj nekünk.",
  cancelledPayment: "A fizetés nem fejeződött be. Megpróbálhatod újra.",
  failed: "A fizetést nem sikerült elindítani. Kérjük, próbáld újra.",
  byArrangement: "Egyeztetés szerint",
  previewTitle: "Előnézet – még nincs elküldve",
  previewText: "Ez az ajánlat még piszkozat. Így fogja látni az ügyfél. Fizetni csak elküldés vagy a link másolása után lehet.",
};

export default offer;

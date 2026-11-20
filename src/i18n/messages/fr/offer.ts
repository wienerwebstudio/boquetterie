import type { PartialMessages } from "@/i18n/messages";

/** fr – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Votre offre",
  eyebrow: "Offre personnalisée {id}",
  title: "Votre offre personnalisée",
  intro: "Bonjour {name}, voici votre offre. Vérifiez tout tranquillement et payez en toute sécurité en ligne.",
  items: "Vos fleurs",
  delivery: "Livraison",
  date: "Date et heure",
  place: "Lieu de livraison",
  recipient: "Destinataire",
  card: "Carte de vœux",
  flowers: "Fleurs",
  extras: "Extras",
  deliveryFee: "Livraison",
  free: "offerte",
  validUntil: "Valable jusqu’au {date}",
  payTitle: "Paiement",
  pay: "Payer maintenant · {total}",
  acceptTerms: "J’ai lu les {terms} et les {withdrawal}.",
  acceptTermsError: "Veuillez accepter les CGV.",
  paidTitle: "Merci – déjà payée",
  paidText: "Cette offre a été payée. Vous avez reçu la confirmation de commande par e-mail.",
  viewOrder: "Voir la commande",
  expiredTitle: "Offre expirée",
  expiredText: "Cette offre n’est plus valable. Écrivez-nous – nous vous en préparerons volontiers une nouvelle.",
  cancelledTitle: "Offre plus disponible",
  cancelledText: "Cette offre a été retirée. Pour toute question, écrivez-nous.",
  cancelledPayment: "Le paiement n’a pas été finalisé. Vous pouvez réessayer.",
  failed: "Le paiement n’a pas pu être lancé. Veuillez réessayer.",
  byArrangement: "Selon accord",
  previewTitle: "Aperçu – pas encore envoyé",
  previewText: "Cette offre est encore un brouillon. Voici comment le client la verra. Le paiement n’est possible qu’une fois l’offre envoyée ou son lien copié.",
};

export default offer;

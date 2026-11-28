import type { PartialMessages } from "@/i18n/messages";

/** fr – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Chargement du champ de paiement …",
    loadFailed: "Le champ de paiement n’a pas pu être chargé. Veuillez recharger la page, essayer un autre navigateur ou choisir un autre moyen de paiement. Aucun montant n’a été débité.",
    redirectHint: "Après « Acheter maintenant », vous confirmez le paiement chez {method}.",
    walletHint: "Après « Acheter maintenant », vous confirmez le paiement avec {method}.",
    amountChanged: "Le total est désormais de {total} (p. ex. en raison des frais de livraison ou d’un bon). Veuillez le vérifier et appuyer à nouveau sur le bouton – aucun montant n’a été débité.",
    failed: "Le paiement n’a pas abouti : {reason} Votre commande {orderId} est enregistrée mais pas encore payée – réessayez tout de suite ou choisissez un autre moyen de paiement.",
    retry: "Veuillez saisir à nouveau vos données de paiement et appuyer encore une fois sur le bouton.",
  },
  express: {
    title: "Achat express",
    /** Divider between the checkout button and the wallet buttons in the cart. */
    intro: "Commandez directement avec Apple Pay, Google Pay ou Link – l’adresse de livraison et les coordonnées proviennent de votre wallet.",
    postalCode: "Code postal du destinataire",
    date: "Jour de livraison",
    window: "Créneau horaire",
    choose: "Veuillez choisir",
    needPostalCode: "Veuillez d’abord saisir le code postal du destinataire.",
    needSlot: "Veuillez d’abord choisir le jour de livraison et le créneau horaire.",
    noDays: "Aucun jour de livraison n’est disponible actuellement pour ce code postal.",
    errors: {
      zone: "Nous ne livrons malheureusement pas à ce code postal. Veuillez choisir une adresse dans notre zone de livraison.",
      date: "Le jour de livraison choisi n’est pas disponible pour cette adresse. Veuillez choisir un autre jour.",
      window: "Le créneau choisi n’est pas disponible pour cette adresse. Veuillez en choisir un autre.",
      minOrder: "Un montant minimum de commande s’applique à cette zone de livraison – veuillez passer à la caisse.",
      items: "Un article n’est pas disponible pour le moment. Veuillez vérifier votre panier.",
      coupon: "Le bon n’est pas valable. Veuillez le retirer ou passer à la caisse.",
      address: "Veuillez choisir dans votre wallet une adresse de livraison complète avec numéro, une adresse e-mail et un numéro de téléphone.",
      amountChanged: "Le montant vient de changer. Veuillez relancer l’achat express – aucun montant n’a été débité.",
      failed: "Le paiement express n’a pas abouti. Aucun montant n’a été débité – réessayez ou passez à la caisse.",
      connection: "Pas de connexion. Veuillez vérifier votre connexion Internet et réessayer.",
    },
    goods: "Fleurs et extras",
    shipping: "Livraison le {date}",
    shippingWindow: "Livraison le {date}, {window}",
    legal: "Avec {wallet}, vous passez une commande avec obligation de paiement · {terms} · {withdrawal}",
    terms: "CGV",
    withdrawal: "Rétractation",
    withdrawalNote: "Il n’existe pas de droit de rétractation pour les fleurs coupées fraîches.",
  },
};

export default pay;

"use client";
import type { ComponentProps } from "react";
import Link from "@/components/ui/link";
import { useI18n } from "@/i18n/client";

/**
 * Translated bits of the product card. The card itself stays a shared component
 * (rendered on the server, and inside client trees like the gift finder), so only
 * these small leaves read the language – no product data is serialised for them.
 */
type CardText = "select" | "pricePending" | "sameDay";
type BadgeKind = "bestseller" | "new" | "seasonal";

export function CardText({ name }: { name: CardText }) {
  const { m } = useI18n();
  return <>{m.shop.card[name]}</>;
}

export function CardBadgeText({ kind }: { kind: BadgeKind }) {
  const { m } = useI18n();
  return <>{m.shop.badges[kind]}</>;
}

/** "ab " – the small word before the lowest price. */
export function CardPriceFrom() {
  const { m } = useI18n();
  return <>{`${m.shop.card.priceFrom} `}</>;
}

export function CardPrice({ value }: { value: number }) {
  const { price } = useI18n();
  return <>{price(value)}</>;
}

/** The image link with its "… ansehen" label. */
export function CardImageLink({ productName, ...rest }: ComponentProps<typeof Link> & { productName: string }) {
  const { m, fmt } = useI18n();
  return <Link aria-label={fmt(m.shop.card.view, { name: productName })} {...rest} />;
}

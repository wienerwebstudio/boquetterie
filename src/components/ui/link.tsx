"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useI18n } from "@/i18n/client";

/**
 * `next/link` that keeps the visitor's language: hrefs are written as German paths
 * (`routes.shop`, "/kontakt") and become `/en/flowers`, `/tr/iletisim` … automatically.
 */
export default function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const { href: localize } = useI18n();
  return <NextLink href={typeof href === "string" ? localize(href) : href} {...rest} />;
}

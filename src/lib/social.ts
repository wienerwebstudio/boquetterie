import type { SiteSettings } from "@/types";

/**
 * WhatsApp and social-media links from the site settings (`brand.social`,
 * `whatsappSupport247`). Pure and client-safe. Every link is optional: an empty,
 * placeholder ("[…]") or non-http(s) value counts as "not set" and hides the link.
 */

/** Profile networks in display order (footer, `sameAs`). WhatsApp is a chat, not a profile. */
export const PROFILE_KEYS = ["instagram", "x", "linkedin", "facebook", "pinterest", "tiktok"] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];
export type SocialKey = ProfileKey | "whatsapp";

/** Brand names – never translated. */
export const SOCIAL_NAMES: Record<SocialKey, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  pinterest: "Pinterest",
  tiktok: "TikTok",
};

type SettingsLike = Pick<SiteSettings, "whatsappSupport247"> & { brand: Pick<SiteSettings["brand"], "social"> };

/** The value as a link, or null when it is empty, a "[…]" placeholder or not an http(s) URL. */
export function usableUrl(value: string | undefined | null): string | null {
  const v = (value ?? "").trim();
  if (!v || v.startsWith("[")) return null;
  try {
    const url = new URL(v);
    return url.protocol === "https:" || url.protocol === "http:" ? v : null;
  } catch {
    return null;
  }
}

/** WhatsApp chat link and whether it is staffed around the clock; null when no link is set. */
export function whatsappSupport(settings: SettingsLike): { href: string; is247: boolean } | null {
  const href = usableUrl(settings.brand.social?.whatsapp);
  return href ? { href, is247: settings.whatsappSupport247 === true } : null;
}

/** Profiles that are set, in display order. */
export function profileLinks(settings: SettingsLike): { key: ProfileKey; name: string; href: string }[] {
  const social = settings.brand.social ?? {};
  return PROFILE_KEYS.flatMap((key) => {
    const href = usableUrl(social[key]);
    return href ? [{ key, name: SOCIAL_NAMES[key], href }] : [];
  });
}

/** Footer row: Instagram, X, LinkedIn (and other profiles), then WhatsApp – only those that are set. */
export function footerSocialLinks(settings: SettingsLike): { key: SocialKey; name: string; href: string }[] {
  const wa = whatsappSupport(settings);
  return [...profileLinks(settings), ...(wa ? [{ key: "whatsapp" as const, name: SOCIAL_NAMES.whatsapp, href: wa.href }] : [])];
}

/** `sameAs` of the Organization JSON-LD: every profile URL (the WhatsApp chat is no profile). */
export function sameAsUrls(settings: SettingsLike): string[] {
  return profileLinks(settings).map((p) => p.href);
}

/** "@blumora.at" from "https://www.instagram.com/blumora.at/"; null for anything else. */
export function instagramHandle(url: string | undefined | null): string | null {
  const href = usableUrl(url);
  if (!href) return null;
  const { hostname, pathname } = new URL(href);
  if (!/(^|\.)instagram\.com$/i.test(hostname)) return null;
  const name = pathname.split("/").filter(Boolean)[0];
  return name ? `@${name}` : null;
}

/**
 * Paths (German, without locale prefix) where the floating WhatsApp button stays away:
 * the checkout and its payment return – nothing may pull the customer out of paying.
 */
export function hidesFloatingWhatsapp(germanPath: string): boolean {
  return germanPath === "/checkout" || germanPath.startsWith("/checkout/");
}

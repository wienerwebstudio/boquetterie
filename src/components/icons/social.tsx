import { siFacebook, siInstagram, siPinterest, siTiktok, siWhatsapp, siX } from "simple-icons";
import type { SocialKey } from "@/lib/social";
import { cn } from "@/lib/format";

/**
 * Brand marks of the social networks (simple-icons, CC0 path data). Monochrome in
 * `currentColor` unless a colour is passed. LinkedIn is no longer part of simple-icons,
 * so its "in" mark is drawn here.
 */
const LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

const PATHS: Record<SocialKey, string> = {
  whatsapp: siWhatsapp.path,
  instagram: siInstagram.path,
  x: siX.path,
  linkedin: LINKEDIN_PATH,
  facebook: siFacebook.path,
  pinterest: siPinterest.path,
  tiktok: siTiktok.path,
};

/** Official WhatsApp green (simple-icons) – for the floating chat button. */
export const WHATSAPP_GREEN = `#${siWhatsapp.hex}`;

/** Decorative mark; the surrounding link carries the accessible name. */
export function SocialMark({ network, className, color }: { network: SocialKey; className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={cn("size-5 shrink-0", className)}>
      <path d={PATHS[network]} fill={color ?? "currentColor"} />
    </svg>
  );
}

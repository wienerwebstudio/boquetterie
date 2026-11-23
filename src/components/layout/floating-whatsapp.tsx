"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { resolvePublicPath, stripLocale } from "@/i18n/paths";
import { useI18n } from "@/i18n/client";
import { useUi } from "@/store/ui";
import { useConsent } from "@/components/consent/store";
import { SocialMark, WHATSAPP_GREEN } from "@/components/icons/social";
import { hidesFloatingWhatsapp } from "@/lib/social";
import { cn } from "@/lib/format";

/**
 * Small round WhatsApp chat button, bottom-right (bottom-left in RTL via `end-*`).
 *
 * It never covers a call to action:
 *  - not rendered in the checkout and its payment return (`hidesFloatingWhatsapp`);
 *  - hidden while the cart drawer, the search, the mobile menu or the consent sheet is open;
 *  - lifted above fixed bars marked `data-fab-lift` (product page sticky "In den Warenkorb" bar);
 *  - faded out while it would overlap an in-page element marked `data-fab-avoid`
 *    (the product page's own "In den Warenkorb" button when scrolled to the bottom).
 */
export function FloatingWhatsapp({ href }: { href: string }) {
  const pathname = usePathname();
  const { m } = useI18n();
  const cartOpen = useUi((s) => s.cartOpen);
  const searchOpen = useUi((s) => s.searchOpen);
  const menuOpen = useUi((s) => s.menuOpen);
  const consentOpen = useConsent((s) => s.isOpen);
  const ref = useRef<HTMLAnchorElement>(null);
  const liftRef = useRef(0);
  const [lift, setLift] = useState(0);
  const [covered, setCovered] = useState(false);

  // Compare the German path, so /en/checkout counts as checkout too.
  const germanPath = stripLocale(resolvePublicPath(pathname)?.internal ?? pathname);
  const routeHidden = hidesFloatingWhatsapp(germanPath);
  const hidden = routeHidden || cartOpen || searchOpen || menuOpen || consentOpen;

  useEffect(() => {
    if (hidden) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const vh = window.innerHeight;
      let next = 0;
      for (const el of document.querySelectorAll<HTMLElement>("[data-fab-lift]")) {
        const r = el.getBoundingClientRect();
        if (r.height === 0 || r.top >= vh - 1) continue; // not shown or slid out of view
        next = Math.max(next, vh - r.top);
      }
      next = Math.ceil(next);
      const btn = ref.current?.getBoundingClientRect();
      if (btn) {
        // Where the button will be once the new lift is applied.
        const shift = next - liftRef.current;
        const box = { top: btn.top - shift, bottom: btn.bottom - shift, left: btn.left, right: btn.right };
        let overlap = false;
        for (const el of document.querySelectorAll<HTMLElement>("[data-fab-avoid]")) {
          const r = el.getBoundingClientRect();
          if (r.height === 0) continue;
          if (r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top) overlap = true;
        }
        setCovered(overlap);
      }
      liftRef.current = next;
      setLift(next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    schedule();
    // The sticky bar appears after hydration and slides in/out with a CSS transition.
    const late = window.setTimeout(schedule, 400);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("transitionend", schedule, true);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(late);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("transitionend", schedule, true);
    };
  }, [hidden, pathname]);

  if (hidden) return null;

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={m.layout.social.whatsappButton}
      title={m.layout.social.whatsappSupport}
      data-testid="floating-whatsapp"
      tabIndex={covered ? -1 : undefined}
      aria-hidden={covered || undefined}
      style={{ bottom: `calc(max(1rem, env(safe-area-inset-bottom)) + ${lift}px)`, backgroundColor: WHATSAPP_GREEN }}
      className={cn(
        "fixed end-4 z-[80] inline-flex size-13 items-center justify-center rounded-full text-white shadow-lift transition-[opacity,transform] duration-300 ease-[var(--ease-soft)] hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest sm:end-6 print:hidden",
        covered && "pointer-events-none scale-90 opacity-0",
      )}
    >
      <SocialMark network="whatsapp" className="size-7" />
    </a>
  );
}

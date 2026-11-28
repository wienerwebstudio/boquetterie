"use client";
import { useEffect } from "react";
import { useI18n } from "@/i18n/client";
import { events, track } from "./track";
import { classifyOutboundLink, pageTypeFromPath } from "./event-props";

/**
 * One delegated click listener for links rendered anywhere (also by Server Components):
 * WhatsApp links → `whatsapp_clicked`, Trustpilot / Google review links → `review_clicked`.
 * Mounted once in the shop shell.
 */
export function ClickTracking() {
  const { locale } = useI18n();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const link = classifyOutboundLink(anchor.href);
      if (!link) return;
      if (link.kind === "whatsapp") track(events.whatsappClicked, { page_type: pageTypeFromPath(window.location.pathname), locale });
      else track(events.reviewClicked, { platform: link.platform });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [locale]);
  return null;
}

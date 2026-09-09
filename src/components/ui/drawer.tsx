"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

export function Drawer({
  open, onClose, title, children, side = "right", footer, width = "max-w-[480px]", className, labelledBy,
}: {
  open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode;
  side?: "right" | "left" | "bottom"; footer?: React.ReactNode; width?: string; className?: string; labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    lastActive.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => panelRef.current?.querySelector<HTMLElement>("[data-autofocus],button,a,input")?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      (lastActive.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined" || !open) return null;

  const position = {
    right: "inset-y-0 right-0 h-full w-full animate-slide-in-right",
    left: "inset-y-0 left-0 h-full w-full animate-[slide-in-right_0.45s_var(--ease-soft)_both_reverse]",
    bottom: "inset-x-0 bottom-0 max-h-[90vh] w-full rounded-t-xl animate-slide-up",
  }[side];

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn("absolute flex flex-col bg-ivory shadow-drawer", position, side !== "bottom" && width, className)}
      >
        {(title || true) && (
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <div className="font-serif text-2xl text-ink" id={labelledBy}>{title}</div>
            <button onClick={onClose} aria-label="Schließen" className="-mr-2 rounded-full p-2 text-ink-muted transition-colors hover:bg-ivory-200 hover:text-ink">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-line bg-ivory px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

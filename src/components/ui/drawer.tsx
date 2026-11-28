"use client";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/format";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useI18n } from "@/i18n/client";

export function Drawer({
  open, onClose, title, children, side = "right", footer, footerClassName, width = "max-w-[480px]", className, labelledBy,
}: {
  open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode;
  side?: "right" | "left" | "bottom"; footer?: React.ReactNode; footerClassName?: string; width?: string; className?: string; labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const titleId = labelledBy ?? autoId;
  const { m } = useI18n();

  // Focus trap, Escape, focus return, inert background and scroll lock.
  useFocusTrap(panelRef, { active: open, onEscape: onClose });

  if (typeof document === "undefined" || !open) return null;

  const position = {
    right: "inset-y-0 right-0 h-full w-full animate-slide-in-right",
    left: "inset-y-0 left-0 h-full w-full animate-slide-in-left",
    bottom: "inset-x-0 bottom-0 max-h-[90vh] w-full rounded-t-xl animate-slide-up",
  }[side];

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn("absolute flex flex-col bg-ivory shadow-drawer", position, side !== "bottom" && width, className)}
      >
        {(title || true) && (
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <div className="font-serif text-2xl text-ink" id={titleId}>{title}</div>
            <button type="button" onClick={onClose} aria-label={m.common.close} className="-mr-2 rounded-full p-2 text-ink-muted transition-colors hover:bg-ivory-200 hover:text-ink">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className={cn("border-t border-line bg-ivory", footerClassName ?? "px-5 py-4 sm:px-6")}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

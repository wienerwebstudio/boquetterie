"use client";
import Image from "next/image";
import { useUi } from "@/store/ui";
import { X } from "lucide-react";

export function ToastViewport() {
  const { toasts, dismissToast } = useUi();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[110] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-lift animate-toast">
          {t.image && (
            <div className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-ivory-200">
              <Image src={t.image} alt="" fill sizes="48px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{t.title}</p>
            {t.description && <p className="truncate text-[13px] text-ink-muted">{t.description}</p>}
          </div>
          {t.action && (
            <button onClick={() => { t.action?.onClick(); dismissToast(t.id); }} className="shrink-0 text-[13px] font-semibold text-forest underline-offset-4 hover:underline">
              {t.action.label}
            </button>
          )}
          <button onClick={() => dismissToast(t.id)} aria-label="Schließen" className="shrink-0 rounded-full p-1 text-ink-soft hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

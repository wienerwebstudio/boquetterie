"use client";
import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import type { ReviewPhoto } from "@/types";
import { cn } from "@/lib/format";
import { useFocusTrap } from "@/lib/use-focus-trap";

/**
 * Small thumbnails under a review; a click opens the photo large in an accessible
 * dialog (focus trap, Escape, focus returns to the thumbnail).
 */
export function ReviewPhotos({ photos, author, className }: { photos: ReviewPhoto[]; author: string; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <ul className={cn("flex flex-wrap gap-2", className)} aria-label={`Fotos von ${author}`}>
        {photos.map((p, i) => (
          <li key={p.src}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`${p.alt} – Foto ${i + 1} von ${photos.length} vergrößern`}
              className="block overflow-hidden rounded-md border border-line transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              <Image src={p.src} alt="" width={64} height={64} sizes="64px" className="size-16 object-cover" />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <PhotoDialog photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} author={author} />}
    </>
  );
}

function PhotoDialog({ photos, index, onIndex, onClose, author }: { photos: ReviewPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void; author: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(panelRef, { active: true, onEscape: onClose });
  const photo = photos[index];
  if (typeof document === "undefined" || !photo) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8" role="presentation">
      <div className="absolute inset-0 bg-ink/70 animate-fade-in" onClick={onClose} aria-hidden />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-md bg-ivory shadow-drawer">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 id={titleId} className="text-[14px] font-semibold text-ink">
            Kundenfoto von {author}{photos.length > 1 ? ` (${index + 1} von ${photos.length})` : ""}
          </h2>
          <button type="button" onClick={onClose} aria-label="Foto schließen" className="inline-flex size-9 items-center justify-center rounded-full text-ink hover:bg-ivory-200">
            <X className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 bg-ivory-200">
          <Image src={photo.src} alt={photo.alt} width={1600} height={1600} sizes="(min-width: 768px) 768px, 100vw" className="mx-auto h-auto max-h-[75vh] w-auto max-w-full object-contain" />
        </div>
        {photos.length > 1 && (
          <div className="flex justify-center gap-2 border-t border-line px-5 py-3">
            {photos.map((p, i) => (
              <button
                key={p.src}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`Foto ${i + 1} zeigen`}
                aria-current={i === index || undefined}
                className={cn("overflow-hidden rounded-md border-2", i === index ? "border-forest" : "border-transparent opacity-70 hover:opacity-100")}
              >
                <Image src={p.src} alt="" width={48} height={48} sizes="48px" className="size-12 object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

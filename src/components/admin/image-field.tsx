"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { FolderOpen, ImageOff, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/format";
import { inputCls, readonlyCls } from "./controls";

/* ---------------- shared helpers (also used by /admin/medien) ---------------- */

export interface MediaItem { key?: string; url: string; bytes: number; modifiedAt: string }
export interface UploadResponse { ok: true; url: string; key: string; width: number; height: number; bytes: number }

export const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Upload one file via POST /api/admin/upload. Throws an Error with a German message. */
export async function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  let res: Response;
  try {
    res = await fetch("/api/admin/upload", { method: "POST", body: form });
  } catch {
    throw new Error("Keine Verbindung zum Server.");
  }
  const data = (await res.json().catch(() => ({}))) as Partial<UploadResponse> & { message?: string };
  if (!res.ok || !data.ok || !data.url) throw new Error(data.message ?? (res.status === 401 ? "Sitzung abgelaufen – bitte neu anmelden." : "Der Upload ist fehlgeschlagen."));
  return data as UploadResponse;
}

export async function fetchMedia(source: "uploads" | "static"): Promise<MediaItem[]> {
  const res = await fetch(source === "static" ? "/api/admin/uploads?source=static" : "/api/admin/uploads", { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; items?: MediaItem[]; message?: string };
  if (!res.ok || !data.ok) throw new Error(data.message ?? "Die Medien konnten nicht geladen werden.");
  return data.items ?? [];
}

export async function deleteMedia(key: string): Promise<void> {
  const res = await fetch(`/api/admin/uploads?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
  if (!res.ok || !data.ok) throw new Error(data.message ?? "Die Datei konnte nicht gelöscht werden.");
}

function pickImages(list: FileList | File[] | null | undefined) {
  return Array.from(list ?? []).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|avif)$/i.test(f.name));
}

/** Drag & drop target. Children render inside; `dragging` is passed for styling. */
export function Dropzone({ onFiles, disabled, className, children }: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  children: (state: { dragging: boolean }) => ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const stop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  return (
    <div
      className={className}
      onDragEnter={(e) => { stop(e); if (disabled) return; depth.current += 1; setDragging(true); }}
      onDragOver={(e) => { stop(e); if (!disabled) e.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={(e) => { stop(e); depth.current = Math.max(0, depth.current - 1); if (depth.current === 0) setDragging(false); }}
      onDrop={(e) => {
        stop(e);
        depth.current = 0;
        setDragging(false);
        if (disabled) return;
        const files = pickImages(e.dataTransfer.files);
        if (files.length) onFiles(files);
      }}
    >
      {children({ dragging })}
    </div>
  );
}

/** Thumbnail with graceful fallback. Uses next/image unoptimized so /uploads and remote hosts work without loader config. */
export function Thumb({ src, className, sizes = "160px" }: { src: string; className?: string; sizes?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  const ok = src && broken !== src && (src.startsWith("/") && !src.startsWith("//") || /^https?:\/\//.test(src));
  return (
    <div className={cn("relative overflow-hidden bg-ivory-100", className)}>
      {ok ? (
        <Image src={src} alt="" fill sizes={sizes} className="object-cover" unoptimized onError={() => setBroken(src)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ink-soft" title={src ? "Bild nicht gefunden" : "Kein Bild"}>
          <ImageOff className="size-5" aria-hidden />
        </div>
      )}
    </div>
  );
}

/* ---------------- media picker modal ---------------- */

type Source = "uploads" | "static";

export function MediaPicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (url: string) => void }) {
  const [source, setSource] = useState<Source>("uploads");
  const [items, setItems] = useState<Record<Source, MediaItem[] | null>>({ uploads: null, static: null });
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || items[source] !== null) return;
    let cancelled = false;
    fetchMedia(source)
      .then((list) => { if (!cancelled) setItems((s) => ({ ...s, [source]: list })); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [open, source, items]);

  const list = useMemo(() => {
    const all = items[source] ?? [];
    const q = query.trim().toLowerCase();
    return q ? all.filter((i) => i.url.toLowerCase().includes(q)) : all;
  }, [items, source, query]);

  if (!open) return null;

  const tab = (s: Source, label: string) => (
    <button
      type="button"
      onClick={() => { setSource(s); setError(null); }}
      className={cn("h-8 rounded-md px-3 text-[13px] font-semibold transition-colors", source === s ? "bg-forest text-ivory" : "text-ink hover:bg-ivory-100")}
      aria-pressed={source === s}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-t-lg bg-white shadow-drawer animate-fade-in sm:rounded-lg">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 id={titleId} className="text-[15px] font-semibold text-ink">Bild wählen</h2>
          <div className="flex items-center gap-1">
            {tab("uploads", "Uploads")}
            {tab("static", "Bilder im Projekt")}
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className="rounded-md p-2 text-ink-muted hover:bg-ivory-100"><X className="size-4" /></button>
        </header>
        <div className="border-b border-line px-5 py-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pfad filtern …"
            className={cn(inputCls, "h-9 max-w-sm")}
            aria-label="Pfad filtern"
          />
        </div>
        <div className="min-h-[200px] flex-1 overflow-y-auto p-5">
          {error ? (
            <p className="text-[13px] text-danger">{error}</p>
          ) : items[source] === null ? (
            <p className="flex items-center gap-2 text-[13px] text-ink-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> Lade …</p>
          ) : list.length === 0 ? (
            <p className="text-[13px] text-ink-muted">{source === "uploads" ? "Noch keine Uploads. Lade ein Bild hoch oder wechsle zu „Bilder im Projekt“." : "Keine Bilder gefunden."}</p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {list.map((item) => (
                <li key={item.url}>
                  <button
                    type="button"
                    onClick={() => { onSelect(item.url); onClose(); }}
                    className="group block w-full overflow-hidden rounded-md border border-line text-left transition-colors hover:border-forest focus:border-forest focus:outline-none"
                    title={item.url}
                  >
                    <Thumb src={item.url} className="aspect-square w-full" />
                    <span className="block truncate px-2 py-1.5 text-[11px] text-ink-muted group-hover:text-ink">{item.url.split("/").pop()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- the form field ---------------- */

export interface ImageFieldProps {
  id?: string;
  value: unknown;
  onChange: (v: string) => void;
  placeholder?: string;
  readonly?: boolean;
  /** Smaller preview for list rows. */
  compact?: boolean;
}

export function ImageField({ id, value, onChange, placeholder, readonly, compact }: ImageFieldProps) {
  const src = typeof value === "string" ? value : "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file || readonly) return;
    setBusy(true);
    setError(null);
    try {
      const res = await uploadImage(file);
      onChange(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Der Upload ist fehlgeschlagen.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [onChange, readonly]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  return (
    <Dropzone onFiles={handleFiles} disabled={readonly || busy} className="min-w-0">
      {({ dragging }) => (
        <div className={cn("flex items-start gap-3 rounded-md transition-colors", dragging && "bg-[#eaf3ee] outline outline-2 outline-dashed outline-forest")}>
          <Thumb src={src.trim()} className={cn("shrink-0 rounded-md border border-line", compact ? "size-14" : "size-20")} sizes="80px" />
          <div className="min-w-0 flex-1 space-y-2">
            <input
              id={id}
              type="text"
              value={src}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder ?? "/images/…/bild.jpg oder /uploads/…"}
              readOnly={readonly}
              className={cn(inputCls, readonly && readonlyCls)}
            />
            {!readonly && (
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => handleFiles(pickImages(e.target.files))} aria-hidden />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-forest transition-colors hover:border-forest disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Upload className="size-3.5" aria-hidden />}
                  {busy ? "Lädt hoch …" : "Hochladen"}
                </button>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  disabled={busy}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-ink transition-colors hover:border-forest disabled:opacity-50"
                >
                  <FolderOpen className="size-3.5" aria-hidden /> Aus Medien wählen
                </button>
                {src && (
                  <button type="button" onClick={() => onChange("")} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] text-ink-muted hover:text-danger" aria-label="Bild entfernen">
                    <X className="size-3.5" aria-hidden /> Entfernen
                  </button>
                )}
              </div>
            )}
            {error ? (
              <p className="text-[12px] text-danger" role="alert">{error}</p>
            ) : !compact ? (
              <p className="text-[12px] text-ink-soft">JPEG, PNG, WebP oder AVIF bis 15 MB. Bilder werden auf max. 2000 px verkleinert. Datei hierher ziehen oder Pfad direkt eingeben.</p>
            ) : null}
          </div>
          <MediaPicker open={pickerOpen} onClose={closePicker} onSelect={onChange} />
        </div>
      )}
    </Dropzone>
  );
}

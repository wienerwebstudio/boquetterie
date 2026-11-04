"use client";

import { useCallback, useRef, useState } from "react";
import { Copy, Loader2, RefreshCw, Trash, Upload } from "lucide-react";
import { useUi } from "@/store/ui";
import { cn } from "@/lib/format";
import { formatDateTime } from "@/lib/format";
import { Banner, EmptyState } from "@/components/admin/controls";
import { ACCEPT, deleteMedia, Dropzone, fetchMedia, formatBytes, Thumb, uploadImage, type MediaItem } from "@/components/admin/image-field";

type UploadState = { name: string; status: "uploading" | "done" | "error"; message?: string };

export function MediaLibrary({ initialItems, driver }: { initialItems: MediaItem[]; driver: "local" | "s3" }) {
  const { toast } = useUi();
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [queue, setQueue] = useState<UploadState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = queue.some((q) => q.status === "uploading");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setItems(await fetchMedia("uploads"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Die Medien konnten nicht geladen werden.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setError(null);
    setQueue(files.map((f) => ({ name: f.name, status: "uploading" })));
    // Sequential keeps the server (sharp) calm and the order predictable.
    for (const [i, file] of files.entries()) {
      try {
        const res = await uploadImage(file);
        setItems((list) => [{ key: res.key, url: res.url, bytes: res.bytes, modifiedAt: new Date().toISOString() }, ...list.filter((x) => x.key !== res.key)]);
        setQueue((q) => q.map((s, j) => (j === i ? { ...s, status: "done" } : s)));
      } catch (e) {
        setQueue((q) => q.map((s, j) => (j === i ? { ...s, status: "error", message: e instanceof Error ? e.message : "Fehler" } : s)));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
    window.setTimeout(() => setQueue((q) => q.filter((s) => s.status === "error")), 2500);
  }, []);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Pfad kopiert", description: url });
    } catch {
      window.prompt("Pfad kopieren:", url);
    }
  };

  const remove = async (item: MediaItem) => {
    if (!item.key) return;
    if (!window.confirm(`„${item.url.split("/").pop()}“ wirklich löschen?\n\nProdukte oder Seiten, die dieses Bild verwenden, zeigen danach kein Bild mehr.`)) return;
    setDeleting(item.key);
    try {
      await deleteMedia(item.key);
      setItems((list) => list.filter((x) => x.key !== item.key));
      toast({ title: "Gelöscht", description: item.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Die Datei konnte nicht gelöscht werden.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      <Dropzone onFiles={handleFiles} disabled={busy}>
        {({ dragging }) => (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-white px-6 py-10 text-center transition-colors",
              dragging ? "border-forest bg-[#eaf3ee]" : "border-line",
            )}
          >
            <Upload className="size-6 text-forest" aria-hidden />
            <div>
              <p className="text-[14px] font-semibold text-ink">Bilder hierher ziehen</p>
              <p className="mt-1 text-[13px] text-ink-muted">JPEG, PNG, WebP oder AVIF bis 15 MB. Werden auf max. 2000 px verkleinert und als JPEG (PNG bei Transparenz) gespeichert.</p>
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT} multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => handleFiles(Array.from(e.target.files ?? []))} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-forest px-4 text-[13px] font-semibold text-ivory transition-colors hover:bg-forest-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
              Dateien auswählen
            </button>
            {queue.length > 0 && (
              <ul className="mt-2 w-full max-w-md space-y-1 text-left text-[12.5px]" aria-live="polite">
                {queue.map((q, i) => (
                  <li key={`${q.name}-${i}`} className={cn("flex items-center justify-between gap-3 rounded-md px-3 py-1.5", q.status === "error" ? "bg-[#f8ecec] text-danger" : "bg-ivory-100 text-ink-muted")}>
                    <span className="truncate">{q.name}</span>
                    <span className="shrink-0">{q.status === "uploading" ? "lädt hoch …" : q.status === "done" ? "fertig" : q.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Dropzone>

      {error && <Banner tone="error">{error}</Banner>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">
          {items.length} {items.length === 1 ? "Datei" : "Dateien"} · Speicher: {driver === "s3" ? "S3-kompatibler Bucket" : "lokal (public/uploads)"}
        </p>
        <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:border-forest disabled:opacity-50">
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden /> Aktualisieren
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState>Noch keine Uploads. Zieh ein Bild in den Bereich oben oder wähle Dateien aus.</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <li key={item.key ?? item.url} className="overflow-hidden rounded-lg border border-line bg-white">
              <Thumb src={item.url} className="aspect-square w-full" sizes="240px" />
              <div className="space-y-1 px-3 py-2.5">
                <p className="truncate text-[12.5px] font-semibold text-ink" title={item.url}>{item.url.split("/").pop()}</p>
                <p className="text-[11.5px] text-ink-soft">{formatBytes(item.bytes)}{item.modifiedAt ? ` · ${formatDateTime(item.modifiedAt)}` : ""}</p>
                <div className="flex items-center gap-1 pt-1">
                  <button type="button" onClick={() => copy(item.url)} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-forest hover:bg-ivory-100">
                    <Copy className="size-3.5" aria-hidden /> Pfad kopieren
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    disabled={deleting === item.key}
                    className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-ink-muted hover:bg-[#f8ecec] hover:text-danger disabled:opacity-50"
                    aria-label={`${item.url.split("/").pop()} löschen`}
                  >
                    {deleting === item.key ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash className="size-3.5" aria-hidden />}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

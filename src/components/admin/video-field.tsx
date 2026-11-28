"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Trash2, Upload, Video } from "lucide-react";
import { cn } from "@/lib/format";
import {
  formatClipDuration,
  MAX_REVIEW_VIDEO_SECONDS,
  REVIEW_VIDEO_ACCEPT,
  reviewVideoAlt,
  videoStartError,
} from "@/lib/review-video";
import { probeReviewVideo, reviewVideoType, uploadChunkedVideo, VideoUploadError } from "@/lib/review-video-client";
import { inputCls } from "./controls";
import { Dropzone } from "./image-field";

/** The fields of a review video next to `src` (all filled by an upload). */
export interface VideoFieldValues {
  src: string;
  poster?: string;
  alt?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface VideoFieldProps {
  id?: string;
  label: string;
  /** Current values of the video object (`video.*`). */
  value: Partial<VideoFieldValues> | undefined;
  /** Sets several sub-fields at once; `null` removes the whole video object. */
  onPatch: (patch: Partial<VideoFieldValues> | null) => void;
  /** Product slug + name of the review (poster file name and default alt text). */
  product?: { slug: string; name: string } | null;
  /** Shown when the storefront will not show the video (demo or unverified review). */
  hiddenNote?: string | null;
  readonly?: boolean;
}

function pickVideos(list: FileList | File[] | null | undefined) {
  return Array.from(list ?? []).filter((f) => reviewVideoType(f) !== null || f.type.startsWith("video/"));
}

type Phase = { step: "idle" } | { step: "probe" } | { step: "upload"; fraction: number } | { step: "finish" };

/**
 * Admin review editor: upload a short customer clip (e.g. sent via WhatsApp) with the
 * same pipeline as the customer form – duration and poster frame are read in the
 * browser, the file goes up in 4 MB chunks to /api/admin/reviews/video, and the
 * returned fields land in the form state („Speichern“ persists them).
 */
export function VideoField({ id, label, value, onPatch, product, hiddenNote, readonly }: VideoFieldProps) {
  const src = typeof value?.src === "string" ? value.src : "";
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = phase.step !== "idle";

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file || readonly) return;
    setError(null);
    const type = reviewVideoType(file);
    if (!type) {
      setError("Bitte ein Video als MP4, MOV oder WebM auswählen.");
      return;
    }
    setPhase({ step: "probe" });
    try {
      let probed;
      try {
        probed = await probeReviewVideo(file);
      } catch {
        throw new Error("Das Video konnte im Browser nicht gelesen werden. Bitte als MP4 (H.264) speichern und erneut hochladen.");
      }
      const tooLong = probed.duration > MAX_REVIEW_VIDEO_SECONDS + 0.5;
      if (tooLong) {
        throw new Error(`Das Video ist ${probed.duration.toFixed(1).replace(".", ",")} Sekunden lang – erlaubt sind höchstens ${MAX_REVIEW_VIDEO_SECONDS} Sekunden. Bitte vorher kürzen (z. B. am Handy unter „Bearbeiten“).`);
      }
      const invalid = videoStartError({ size: file.size, type, duration: probed.duration });
      if (invalid) throw new Error(invalid);

      setPhase({ step: "upload", fraction: 0 });
      const { result } = await uploadChunkedVideo({
        endpoint: "/api/admin/reviews/video",
        file,
        type,
        duration: probed.duration,
        finish: (form) => {
          form.set("poster", probed.poster, "poster.jpg");
          form.set("width", String(probed.width));
          form.set("height", String(probed.height));
          if (product?.slug) form.set("product", product.slug);
          setPhase({ step: "finish" });
        },
        onProgress: (fraction) => setPhase({ step: "upload", fraction }),
      });
      const video = result.video as Omit<VideoFieldValues, "alt"> | undefined;
      if (!video?.src) throw new Error("Das Video konnte gerade nicht gespeichert werden.");
      const alt = typeof value?.alt === "string" && value.alt.trim() ? value.alt : reviewVideoAlt(product?.name);
      onPatch({ ...video, alt });
    } catch (e) {
      const message = e instanceof VideoUploadError
        ? e.status === 401 ? "Sitzung abgelaufen – bitte neu anmelden." : e.message || "Der Upload ist fehlgeschlagen. Bitte noch einmal versuchen."
        : e instanceof Error ? e.message : "Der Upload ist fehlgeschlagen.";
      setError(message);
    } finally {
      setPhase({ step: "idle" });
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [onPatch, product, readonly, value?.alt]);

  const remove = () => {
    if (!window.confirm("Video aus dieser Bewertung entfernen? Die Datei bleibt gespeichert.")) return;
    setError(null);
    onPatch(null);
  };

  const percent = phase.step === "upload" ? Math.round(phase.fraction * 100) : phase.step === "finish" ? 100 : 0;
  const details = [
    typeof value?.duration === "number" && value.duration > 0 ? `Länge ${formatClipDuration(value.duration)}` : null,
    value?.width && value?.height ? `${value.width} × ${value.height} px` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">{label}</p>
      <Dropzone onFiles={handleFiles} disabled={readonly || busy} pick={pickVideos} className="min-w-0">
        {({ dragging }) => (
          <div className={cn("flex flex-col gap-3 rounded-md border border-dashed border-line-strong bg-white p-4 transition-colors sm:flex-row sm:items-start", dragging && "border-forest bg-[#eaf3ee]")}>
            {src ? (
              <video
                key={src}
                controls
                playsInline
                preload="metadata"
                src={src}
                poster={value?.poster || undefined}
                aria-label={value?.alt || "Kundenvideo"}
                data-testid="admin-review-video-preview"
                className="h-auto max-h-56 w-auto max-w-full shrink-0 rounded-md border border-line bg-ink object-contain sm:max-w-[240px]"
              />
            ) : (
              <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-md border border-line bg-ivory-100 text-ink-soft sm:w-40" aria-hidden>
                <Video className="size-6" strokeWidth={1.5} />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              {src && details && <p className="text-[13px] font-medium text-ink" data-testid="admin-review-video-details">{details}</p>}
              {!readonly && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    id={id ? `${id}-file` : undefined}
                    type="file"
                    accept={`${REVIEW_VIDEO_ACCEPT},.mp4,.m4v,.mov,.webm`}
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Videodatei auswählen"
                    data-testid="admin-review-video-input"
                    onChange={(e) => handleFiles(pickVideos(e.target.files))}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[13px] font-semibold text-[#0a6644] transition-colors hover:border-forest disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
                    {busy ? "Lädt hoch …" : src ? "Anderes Video hochladen" : "Video hochladen"}
                  </button>
                  {src && (
                    <button
                      type="button"
                      onClick={remove}
                      disabled={busy}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-muted transition-colors hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden /> Video entfernen
                    </button>
                  )}
                </div>
              )}
              {busy && (
                <div className="space-y-1" aria-live="polite">
                  <div
                    role="progressbar"
                    aria-label="Upload-Fortschritt"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-ivory-100"
                  >
                    <div className="h-full rounded-full bg-forest transition-[width] duration-300" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-[12px] text-ink-muted">
                    {phase.step === "probe" ? "Video wird geprüft …" : phase.step === "finish" ? "Vorschaubild wird gespeichert …" : `Hochgeladen: ${percent} %`}
                  </p>
                </div>
              )}
              {error ? (
                <p className="text-[12.5px] font-medium text-danger" role="alert">{error}</p>
              ) : (
                <p className="text-[12px] text-ink-soft">
                  MP4, MOV oder WebM, höchstens {MAX_REVIEW_VIDEO_SECONDS} Sekunden und 60 MB. Datei hierher ziehen oder auswählen; Länge, Größe und Vorschaubild werden automatisch übernommen. Mit „Speichern“ erscheint das Video im Shop.
                </p>
              )}
              {hiddenNote && <p className="text-[12px] text-[#7d4800]">{hiddenNote}</p>}
              <details className="text-[12.5px] text-ink-muted">
                <summary className="cursor-pointer select-none font-medium hover:text-ink">Videopfad manuell bearbeiten</summary>
                <input
                  id={id}
                  type="text"
                  value={src}
                  onChange={(e) => onPatch({ src: e.target.value })}
                  placeholder="/media/review-videos/…/video.mp4"
                  readOnly={readonly}
                  aria-label="Videopfad"
                  className={cn(inputCls, "mt-2")}
                />
              </details>
            </div>
          </div>
        )}
      </Dropzone>
    </div>
  );
}

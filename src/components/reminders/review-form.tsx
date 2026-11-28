"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "@/components/ui/link";
import { ArrowRight, Check, ImagePlus, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/format";
import { onRadioGroupKeyDown, rovingTabIndex } from "@/lib/roving-radio";
import { routes } from "@/lib/urls";
import { FOUND_VIA_OPTIONS, type FoundViaSource } from "@/lib/found-via";
import { CLIENT_PHOTO_BUDGET_BYTES, MAX_REVIEW_PHOTO_BYTES, MAX_REVIEW_PHOTOS, REVIEW_PHOTO_ACCEPT } from "@/lib/review-submission";
import { formatClipDuration, MAX_REVIEW_VIDEO_BYTES, MAX_REVIEW_VIDEO_SECONDS, REVIEW_VIDEO_ACCEPT, REVIEW_VIDEO_DURATION_TOLERANCE, type ReviewVideoType } from "@/lib/review-video";
import { discardReviewVideo, probeReviewVideo, reviewVideoType, uploadReviewVideo, VideoUploadError } from "@/lib/review-video-client";
import { useI18n } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { rich } from "@/components/checkout/rich-text";

interface FormState { name: string; rating: number; text: string; website: string; consent: boolean }
type Errors = Partial<Record<keyof FormState | "photos" | "video", string>>;

interface Photo { id: string; blob: Blob; name: string; preview: string }
/** The picked clip; `uploaded` is the upload id once the chunked upload has finished (reused on a retry). */
interface PickedVideo { file: File; type: ReviewVideoType; name: string; duration: number; poster: Blob; posterUrl: string; uploaded?: string }
const MAX_VIDEO_MB = Math.round(MAX_REVIEW_VIDEO_BYTES / 1024 / 1024);

/** Star count (index + 1) → key of its label in `reminders.reviewForm.ratings`. */
const RATING_KEYS = ["r1", "r2", "r3", "r4", "r5"] as const;
/** Found-via id → key of its label in `reminders.reviewForm.foundVia.options`. */
const FOUND_VIA_KEYS = {
  google: "google",
  maps: "maps",
  instagram: "instagram",
  tiktok: "tiktok",
  facebook: "facebook",
  empfehlung: "recommendation",
  stammkunde: "returningCustomer",
  sonstiges: "other",
} as const satisfies Record<FoundViaSource, string>;
type ReviewTexts = Messages["reminders"]["reviewForm"];
/** Photos are shrunk in the browser before upload (the server re-encodes them anyway). */
const CLIENT_MAX_SIDE = 1600;

function validate(f: FormState, t: ReviewTexts["errors"]): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = t.name;
  if (f.rating < 1 || f.rating > 5) e.rating = t.rating;
  if (f.text.trim().length < 10) e.text = t.textShort;
  if (f.text.length > 1000) e.text = t.textLong;
  if (!f.consent) e.consent = t.consent;
  return e;
}

/**
 * Rotates (EXIF orientation), shrinks to CLIENT_MAX_SIDE and re-encodes as JPEG, so
 * three phone photos fit into one request. If the browser cannot decode the file,
 * the original is sent and the server decides.
 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, CLIENT_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** "Wie hast du uns gefunden?" – optional, sent with the review; only for the team. */
function FoundViaQuestion({ source, other, onSource, onOther }: {
  source: FoundViaSource | ""; other: string; onSource: (s: FoundViaSource) => void; onOther: (v: string) => void;
}) {
  const t = useI18n().m.reminders.reviewForm.foundVia;
  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby="found-via-label">
      <span id="found-via-label" className="text-[13px] font-semibold text-ink">{t.question} <span className="font-normal text-ink-muted">{t.optional}</span></span>
      <div role="radiogroup" aria-labelledby="found-via-label" onKeyDown={onRadioGroupKeyDown} className="mt-1 flex flex-wrap gap-2">
        {FOUND_VIA_OPTIONS.map((o, i) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={source === o.id}
            tabIndex={rovingTabIndex(source === o.id, i, Boolean(source))}
            onClick={() => onSource(o.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
              source === o.id ? "border-forest bg-forest text-ivory" : "border-line bg-white text-ink hover:border-forest/50",
            )}
          >
            {t.options[FOUND_VIA_KEYS[o.id]]}
          </button>
        ))}
      </div>
      {source === "sonstiges" && (
        <Input label={t.where} name="found_via_other" maxLength={80} value={other} onChange={(e) => onOther(e.target.value)} className="mt-1" />
      )}
    </div>
  );
}

export function ReviewForm({ orderId, token, defaultName, className, askFoundVia = true }: { orderId: string; token: string; defaultName?: string; className?: string; askFoundVia?: boolean }) {
  const [source, setSource] = useState<FoundViaSource | "">("");
  const [sourceOther, setSourceOther] = useState("");
  const [form, setForm] = useState<FormState>({ name: defaultName ?? "", rating: 0, text: "", website: "", consent: false });
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const photosRef = useRef<Photo[]>([]);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [preparingVideo, setPreparingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<PickedVideo | null>(null);
  const { m, fmt } = useI18n();
  const t = m.reminders.reviewForm;
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    videoRef.current = video;
  }, [video]);
  // Free the preview URLs when the form goes away.
  useEffect(() => () => {
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
    if (videoRef.current) URL.revokeObjectURL(videoRef.current.posterUrl);
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const addPhotos = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (fileInput.current) fileInput.current.value = "";
    if (!files.length) return;
    const room = MAX_REVIEW_PHOTOS - photos.length;
    let message: string | undefined;
    if (files.length > room) message = fmt(t.errors.tooManyPhotos, { max: MAX_REVIEW_PHOTOS, rest: room > 0 ? (room === 1 ? t.errors.oneTaken : fmt(t.errors.someTaken, { count: room })) : t.errors.removeFirst });
    const accepted: File[] = [];
    for (const file of files.slice(0, Math.max(0, room))) {
      if (file.type && !file.type.startsWith("image/")) { message = t.errors.photosOnly; continue; }
      if (file.size > MAX_REVIEW_PHOTO_BYTES) { message = fmt(t.errors.photoTooBig, { name: file.name }); continue; }
      accepted.push(file);
    }
    setPreparing(true);
    const prepared: Photo[] = [];
    for (const file of accepted) {
      const blob = await shrink(file);
      prepared.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, blob, name: file.name, preview: URL.createObjectURL(blob) });
    }
    setPreparing(false);
    const next = [...photos, ...prepared];
    const total = next.reduce((s, p) => s + p.blob.size, 0);
    if (total > CLIENT_PHOTO_BUDGET_BYTES) {
      prepared.forEach((p) => URL.revokeObjectURL(p.preview));
      setErrors((prev) => ({ ...prev, photos: t.errors.photosTooBigTotal }));
      return;
    }
    setPhotos(next);
    setErrors((prev) => ({ ...prev, photos: message }));
  };

  const removePhoto = (id: string) => {
    setPhotos((list) => {
      const gone = list.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return list.filter((p) => p.id !== id);
    });
    setErrors((prev) => ({ ...prev, photos: undefined }));
  };

  /** Checks type, size and length (≤ 15 s) in the browser and grabs a poster frame. */
  const pickVideo = async (list: FileList | null) => {
    const file = list?.[0];
    if (videoInput.current) videoInput.current.value = "";
    if (!file) return;
    const type = reviewVideoType(file);
    if (!type) return setErrors((prev) => ({ ...prev, video: t.errors.videoType }));
    if (file.size > MAX_REVIEW_VIDEO_BYTES) return setErrors((prev) => ({ ...prev, video: fmt(t.errors.videoTooBig, { mb: MAX_VIDEO_MB }) }));
    setPreparingVideo(true);
    try {
      const probed = await probeReviewVideo(file);
      if (probed.duration > MAX_REVIEW_VIDEO_SECONDS + REVIEW_VIDEO_DURATION_TOLERANCE) {
        setErrors((prev) => ({ ...prev, video: fmt(t.errors.videoTooLong, { seconds: MAX_REVIEW_VIDEO_SECONDS }) }));
        return;
      }
      if (video) removeVideo();
      setVideo({ file, type, name: file.name, duration: probed.duration, poster: probed.poster, posterUrl: URL.createObjectURL(probed.poster) });
      setErrors((prev) => ({ ...prev, video: undefined }));
    } catch {
      setErrors((prev) => ({ ...prev, video: t.errors.videoUnreadable }));
    } finally {
      setPreparingVideo(false);
    }
  };

  const removeVideo = () => {
    if (!video) return;
    URL.revokeObjectURL(video.posterUrl);
    if (video.uploaded) discardReviewVideo(orderId, token, video.uploaded);
    setVideo(null);
    setErrors((prev) => ({ ...prev, video: undefined }));
  };

  /** Chunked upload before the review is sent; resolves with the upload id (or null without a video). */
  const ensureVideoUploaded = async (): Promise<string | null> => {
    if (!video) return null;
    if (video.uploaded) return video.uploaded;
    setVideoProgress(0);
    try {
      const id = await uploadReviewVideo({ orderId, token, file: video.file, type: video.type, duration: video.duration, poster: video.poster, onProgress: setVideoProgress });
      setVideo((v) => (v ? { ...v, uploaded: id } : v));
      return id;
    } finally {
      setVideoProgress(null);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form, t.errors);
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus("sending");
    setFailMessage(null);
    let videoId: string | null = null;
    try {
      videoId = await ensureVideoUploaded();
    } catch (err) {
      const message = err instanceof VideoUploadError && err.message ? err.message : t.errors.videoUploadFailed;
      setErrors((prev) => ({ ...prev, video: message }));
      setFailMessage(message);
      setStatus("failed");
      return;
    }
    try {
      const body = new FormData();
      body.set("order", orderId);
      body.set("token", token);
      body.set("name", form.name.trim());
      body.set("rating", String(form.rating));
      body.set("text", form.text.trim());
      body.set("consent", form.consent ? "true" : "false");
      body.set("website", form.website);
      if (askFoundVia && source) {
        body.set("found_via", source);
        if (source === "sonstiges" && sourceOther.trim()) body.set("found_via_other", sourceOther.trim());
      }
      if (videoId) body.set("video", videoId);
      photos.forEach((p, i) => body.append("photos", p.blob, `foto-${i + 1}.${p.blob.type === "image/png" ? "png" : p.blob.type === "image/webp" ? "webp" : "jpg"}`));
      const res = await fetch("/api/reviews", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; errors?: Errors; message?: string } | null;
      if (!res.ok || !data?.ok) {
        if (data?.errors) setErrors(data.errors);
        setFailMessage(data?.message ?? (res.status === 413 ? t.errors.photosTooBig : null));
        setStatus("failed");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "sent") {
    return (
      <div className={className} role="status" aria-live="polite">
        <div className="rounded-md border border-line bg-white/70 p-8 sm:p-10">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-5" strokeWidth={2.5} aria-hidden /></span>
          <h2 className="display-3 mt-5 text-ink">{t.sentTitle}</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            {t.sentText}
          </p>
          <Button href="/blumen" variant="link" className="mt-6" iconRight={<ArrowRight className="size-4" aria-hidden />}>{t.toBouquets}</Button>
        </div>
      </div>
    );
  }

  const shown = hover || form.rating;

  return (
    <form onSubmit={submit} noValidate className={className} aria-label={t.label}>
      <div className="grid gap-5">
        <div className="flex flex-col gap-1.5">
          <span id="rating-label" className="text-[13px] font-semibold text-ink">{t.rating}</span>
          <div
            role="radiogroup"
            aria-labelledby="rating-label"
            aria-required="true"
            aria-invalid={Boolean(errors.rating) || undefined}
            aria-describedby={errors.rating ? "rating-error" : undefined}
            onKeyDown={onRadioGroupKeyDown}
            className="flex items-center gap-3"
          >
            <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={form.rating === n}
                  tabIndex={rovingTabIndex(form.rating === n, n - 1, form.rating > 0)}
                  aria-label={fmt(t.starAria, { n, label: t.ratings[RATING_KEYS[n - 1]] })}
                  onClick={() => set("rating", n)}
                  onMouseEnter={() => setHover(n)}
                  onFocus={() => setHover(n)}
                  onBlur={() => setHover(0)}
                  className="rounded-sm p-0.5 text-forest transition-transform hover:scale-110"
                >
                  <svg viewBox="0 0 20 20" className="size-8" aria-hidden fill={n <= shown ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2">
                    <path d="M10 2.5l2.3 4.9 5.3.7-3.9 3.7.9 5.3L10 14.6l-4.7 2.5.9-5.3L2.4 8.1l5.3-.7z" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
            <span className={cn("text-[14px]", shown ? "text-ink" : "text-ink-soft")}>{shown ? t.ratings[RATING_KEYS[shown - 1]] : t.chooseStars}</span>
          </div>
          {errors.rating && <p id="rating-error" role="alert" className="text-[13px] text-danger">{errors.rating}</p>}
        </div>

        <Input label={t.name} name="name" autoComplete="name" maxLength={60} value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} hint={t.nameHint} required />
        <Textarea label={t.text} name="text" rows={6} maxLength={1000} value={form.text} onChange={(e) => set("text", e.target.value)} error={errors.text} hint={fmt(t.textHint, { count: form.text.length })} placeholder={t.textPlaceholder} required />

        <div className="flex flex-col gap-2" role="group" aria-labelledby="photos-label" aria-describedby={errors.photos ? "photos-hint photos-error" : "photos-hint"}>
          <span id="photos-label" className="text-[13px] font-semibold text-ink">{t.photos} <span className="font-normal text-ink-muted">{t.optional}</span></span>
          <p id="photos-hint" className="text-[13px] text-ink-muted">{fmt(t.photosHint, { max: MAX_REVIEW_PHOTOS })}</p>
          {photos.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-3" aria-label={t.selectedPhotos}>
              {photos.map((p, i) => (
                <li key={p.id} className="relative">
                  {/* Local preview of a not yet uploaded file (blob: URL) – next/image cannot load it. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={fmt(t.photoAlt, { number: i + 1, name: p.name })} className="size-24 rounded-md border border-line object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    aria-label={fmt(t.removePhoto, { number: i + 1 })}
                    className="absolute -right-2 -top-2 inline-flex size-7 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft hover:bg-ivory-200"
                  >
                    <X className="size-3.5" strokeWidth={2} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {photos.length < MAX_REVIEW_PHOTOS && (
            <div>
              <input
                ref={fileInput}
                id="review-photos"
                type="file"
                accept={REVIEW_PHOTO_ACCEPT}
                multiple
                tabIndex={-1}
                aria-hidden
                className="sr-only"
                onChange={(e) => void addPhotos(e.target.files)}
              />
              <Button type="button" variant="outline" size="sm" loading={preparing} onClick={() => fileInput.current?.click()} icon={<ImagePlus className="size-4" aria-hidden />}>
                {photos.length ? t.addMorePhotos : t.addPhotos}
              </Button>
            </div>
          )}
          {errors.photos && <p id="photos-error" role="alert" className="text-[13px] text-danger">{errors.photos}</p>}
        </div>

        <div className="flex flex-col gap-2" role="group" aria-labelledby="video-label" aria-describedby={errors.video ? "video-hint video-error" : "video-hint"}>
          <span id="video-label" className="text-[13px] font-semibold text-ink">{t.video} <span className="font-normal text-ink-muted">{t.optional}</span></span>
          <p id="video-hint" className="text-[13px] text-ink-muted">{fmt(t.videoHint, { seconds: MAX_REVIEW_VIDEO_SECONDS, mb: MAX_VIDEO_MB })}</p>
          {video ? (
            <div className="relative mt-1 self-start">
              {/* Poster frame of the not yet uploaded clip (blob: URL) – next/image cannot load it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={video.posterUrl} alt={fmt(t.videoPreviewAlt, { name: video.name })} className="h-24 w-auto max-w-[200px] rounded-md border border-line bg-ink object-cover" />
              <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-ink/75 px-2 py-0.5 text-[11.5px] text-ivory">
                <Video className="size-3.5" strokeWidth={1.5} aria-hidden />
                {fmt(t.videoLength, { duration: formatClipDuration(video.duration) })}
              </span>
              <button
                type="button"
                onClick={removeVideo}
                disabled={status === "sending"}
                aria-label={t.removeVideo}
                className="absolute -right-2 -top-2 inline-flex size-7 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft hover:bg-ivory-200"
              >
                <X className="size-3.5" strokeWidth={2} aria-hidden />
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={videoInput}
                id="review-video"
                type="file"
                accept={REVIEW_VIDEO_ACCEPT}
                tabIndex={-1}
                aria-hidden
                className="sr-only"
                onChange={(e) => void pickVideo(e.target.files)}
              />
              <Button type="button" variant="outline" size="sm" loading={preparingVideo} onClick={() => videoInput.current?.click()} icon={<Video className="size-4" aria-hidden />}>
                {t.addVideo}
              </Button>
            </div>
          )}
          {videoProgress !== null && (
            <div role="status" aria-live="polite" className="flex max-w-xs flex-col gap-1.5">
              <span className="text-[13px] text-ink-muted">{fmt(t.uploadingVideo, { percent: Math.round(videoProgress * 100) })}</span>
              <span className="block h-1 overflow-hidden rounded-full bg-line" aria-hidden>
                <span className="block h-full bg-forest transition-[width]" style={{ width: `${Math.round(videoProgress * 100)}%` }} />
              </span>
            </div>
          )}
          {errors.video && <p id="video-error" role="alert" className="text-[13px] text-danger">{errors.video}</p>}
        </div>

        {askFoundVia && (
          <FoundViaQuestion source={source} other={sourceOther} onSource={setSource} onOther={setSourceOther} />
        )}

        <div className="flex flex-col gap-1.5">
          <Checkbox
            id="review-consent"
            name="consent"
            checked={form.consent}
            onChange={(e) => set("consent", e.target.checked)}
            required
            aria-invalid={Boolean(errors.consent) || undefined}
            aria-describedby={errors.consent ? "review-consent-error" : undefined}
            label={t.consent}
          />
          {errors.consent && <p id="review-consent-error" role="alert" className="pl-7 text-[13px] text-danger">{errors.consent}</p>}
        </div>

        <div className="hidden" aria-hidden>
          <label htmlFor="review-website">Website</label>
          <input id="review-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </div>
      </div>

      {status === "failed" && (
        <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-danger">
          {failMessage ?? t.errors.saveFailed}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[12px] leading-relaxed text-ink-soft">
          {rich(t.footer, { orderId, link: <Link href={routes.legal.privacy} className="underline underline-offset-2 hover:text-forest">{t.privacyLink}</Link> })}
        </p>
        <Button type="submit" size="lg" loading={status === "sending"} disabled={preparing || preparingVideo} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          {t.submit}
        </Button>
      </div>
    </form>
  );
}

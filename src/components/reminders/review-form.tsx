"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/format";
import { onRadioGroupKeyDown, rovingTabIndex } from "@/lib/roving-radio";
import { routes } from "@/lib/urls";
import { CLIENT_PHOTO_BUDGET_BYTES, MAX_REVIEW_PHOTO_BYTES, MAX_REVIEW_PHOTOS, REVIEW_CONSENT_TEXT, REVIEW_PHOTO_ACCEPT } from "@/lib/review-submission";

interface FormState { name: string; rating: number; text: string; website: string; consent: boolean }
type Errors = Partial<Record<keyof FormState | "photos", string>>;

interface Photo { id: string; blob: Blob; name: string; preview: string }

const RATING_LABELS = ["", "Enttäuschend", "Geht so", "Gut", "Sehr gut", "Wunderbar"];
/** Photos are shrunk in the browser before upload (the server re-encodes them anyway). */
const CLIENT_MAX_SIDE = 1600;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Bitte gib deinen Namen an (z. B. „Anna M.“).";
  if (f.rating < 1 || f.rating > 5) e.rating = "Bitte wähle 1 bis 5 Sterne.";
  if (f.text.trim().length < 10) e.text = "Bitte schreib ein paar Worte (mindestens 10 Zeichen).";
  if (f.text.length > 1000) e.text = "Die Bewertung darf höchstens 1000 Zeichen lang sein.";
  if (!f.consent) e.consent = "Bitte bestätige, dass wir deine Bewertung zeigen dürfen.";
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

export function ReviewForm({ orderId, token, defaultName, className }: { orderId: string; token: string; defaultName?: string; className?: string }) {
  const [form, setForm] = useState<FormState>({ name: defaultName ?? "", rating: 0, text: "", website: "", consent: false });
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  // Free the preview URLs when the form goes away.
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

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
    if (files.length > room) message = `Höchstens ${MAX_REVIEW_PHOTOS} Fotos – ${room > 0 ? `${room === 1 ? "eines wurde" : `${room} wurden`} übernommen` : "bitte zuerst eines entfernen"}.`;
    const accepted: File[] = [];
    for (const file of files.slice(0, Math.max(0, room))) {
      if (file.type && !file.type.startsWith("image/")) { message = "Bitte nur Fotos auswählen (JPEG, PNG oder WebP)."; continue; }
      if (file.size > MAX_REVIEW_PHOTO_BYTES) { message = `„${file.name}“ ist zu groß (maximal 10 MB pro Foto).`; continue; }
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
      setErrors((prev) => ({ ...prev, photos: "Die Fotos sind zusammen zu groß. Bitte weniger oder kleinere Fotos wählen." }));
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus("sending");
    setFailMessage(null);
    try {
      const body = new FormData();
      body.set("order", orderId);
      body.set("token", token);
      body.set("name", form.name.trim());
      body.set("rating", String(form.rating));
      body.set("text", form.text.trim());
      body.set("consent", form.consent ? "true" : "false");
      body.set("website", form.website);
      photos.forEach((p, i) => body.append("photos", p.blob, `foto-${i + 1}.${p.blob.type === "image/png" ? "png" : p.blob.type === "image/webp" ? "webp" : "jpg"}`));
      const res = await fetch("/api/reviews", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; errors?: Errors; message?: string } | null;
      if (!res.ok || !data?.ok) {
        if (data?.errors) setErrors(data.errors);
        setFailMessage(data?.message ?? (res.status === 413 ? "Die Fotos sind zu groß. Bitte weniger oder kleinere Fotos wählen." : null));
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
          <h2 className="display-3 mt-5 text-ink">Danke für deine Bewertung.</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
            Wir lesen jede Bewertung persönlich. Sobald wir sie freigegeben haben, erscheint sie im Shop.
          </p>
          <Button href="/blumen" variant="link" className="mt-6" iconRight={<ArrowRight className="size-4" aria-hidden />}>Zu den Sträußen</Button>
        </div>
      </div>
    );
  }

  const shown = hover || form.rating;

  return (
    <form onSubmit={submit} noValidate className={className} aria-label="Bewertung schreiben">
      <div className="grid gap-5">
        <div className="flex flex-col gap-1.5">
          <span id="rating-label" className="text-[13px] font-semibold text-ink">Deine Bewertung</span>
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
                  aria-label={`${n} von 5 Sternen – ${RATING_LABELS[n]}`}
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
            <span className={cn("text-[14px]", shown ? "text-ink" : "text-ink-soft")}>{shown ? RATING_LABELS[shown] : "Sterne wählen"}</span>
          </div>
          {errors.rating && <p id="rating-error" role="alert" className="text-[13px] text-danger">{errors.rating}</p>}
        </div>

        <Input label="Dein Name" name="name" autoComplete="name" maxLength={60} value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} hint="So erscheint er im Shop – z. B. „Anna M.“" required />
        <Textarea label="Wie war der Strauß?" name="text" rows={6} maxLength={1000} value={form.text} onChange={(e) => set("text", e.target.value)} error={errors.text} hint={`${form.text.length}/1000 Zeichen`} placeholder="Frische, Lieferung, Karte – was ist dir aufgefallen?" required />

        <div className="flex flex-col gap-2" role="group" aria-labelledby="photos-label" aria-describedby={errors.photos ? "photos-hint photos-error" : "photos-hint"}>
          <span id="photos-label" className="text-[13px] font-semibold text-ink">Fotos vom Strauß <span className="font-normal text-ink-muted">(optional)</span></span>
          <p id="photos-hint" className="text-[13px] text-ink-muted">Bis zu {MAX_REVIEW_PHOTOS} Fotos, JPEG, PNG oder WebP, je max. 10 MB. Wir entfernen Standort- und Kameradaten.</p>
          {photos.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-3" aria-label="Ausgewählte Fotos">
              {photos.map((p, i) => (
                <li key={p.id} className="relative">
                  {/* Local preview of a not yet uploaded file (blob: URL) – next/image cannot load it. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={`Foto ${i + 1}: ${p.name}`} className="size-24 rounded-md border border-line object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    aria-label={`Foto ${i + 1} entfernen`}
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
                {photos.length ? "Weiteres Foto hinzufügen" : "Fotos hinzufügen"}
              </Button>
            </div>
          )}
          {errors.photos && <p id="photos-error" role="alert" className="text-[13px] text-danger">{errors.photos}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Checkbox
            id="review-consent"
            name="consent"
            checked={form.consent}
            onChange={(e) => set("consent", e.target.checked)}
            required
            aria-invalid={Boolean(errors.consent) || undefined}
            aria-describedby={errors.consent ? "review-consent-error" : undefined}
            label={REVIEW_CONSENT_TEXT}
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
          {failMessage ?? "Die Bewertung konnte nicht gespeichert werden. Bitte versuch es noch einmal."}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[12px] leading-relaxed text-ink-soft">
          Deine Bewertung wird vor der Veröffentlichung von uns gelesen. Bestellnummer {orderId}. Mehr dazu in der{" "}
          <Link href={routes.legal.privacy} className="underline underline-offset-2 hover:text-forest">Datenschutzerklärung</Link>.
        </p>
        <Button type="submit" size="lg" loading={status === "sending"} disabled={preparing} iconRight={<ArrowRight className="size-4" aria-hidden />}>
          Bewertung absenden
        </Button>
      </div>
    </form>
  );
}

/**
 * Input handling for customer reviews (POST /api/reviews and the review form).
 * Pure – no storage, no sharp – so the client form and the unit tests share the
 * same limits and messages.
 */

import type { Review, ReviewPhoto } from "@/types";

/** Customer photos shown on the site: only for real, verified reviews – never for demo entries. */
export function publicReviewPhotos(review: Review): ReviewPhoto[] {
  if (review.demo || !review.verified) return [];
  return (review.photos ?? []).filter((p) => typeof p?.src === "string" && p.src.length > 0);
}

/** Wording of the required consent checkbox; stored with a timestamp for every review. */
export const REVIEW_CONSENT_TEXT = "Ich bin einverstanden, dass Blumora meine Bewertung mit Vornamen und die hochgeladenen Fotos auf blumora.at zeigt.";

export const MAX_REVIEW_PHOTOS = 3;
/** Per photo as it arrives at the server (the form shrinks photos before sending). */
export const MAX_REVIEW_PHOTO_BYTES = 10 * 1024 * 1024;
/** Upper bound for the whole multipart body (3 photos + text fields). */
export const MAX_REVIEW_REQUEST_BYTES = MAX_REVIEW_PHOTOS * MAX_REVIEW_PHOTO_BYTES + 512 * 1024;
/**
 * What the browser form aims for in total. Netlify Functions accept request bodies up
 * to about 6 MB (binary data is base64-encoded on the way, so ~4.5 MB of photos).
 */
export const CLIENT_PHOTO_BUDGET_BYTES = 4 * 1024 * 1024;
/** MIME types the file picker offers. iOS converts HEIC photos to JPEG for such an input. */
export const REVIEW_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

export interface ReviewFields {
  order: string;
  token: string;
  name: string;
  rating: number;
  text: string;
  website: string;
  consent: boolean;
}

export type ReviewFieldErrors = Partial<Record<"name" | "rating" | "text" | "consent" | "photos", string>>;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const truthy = (v: unknown) => v === true || v === "true" || v === "on" || v === "1" || v === "yes";

/** Reads the text fields from a multipart form or a JSON body. */
export function readReviewFields(source: FormData | Record<string, unknown>): ReviewFields {
  const get = (k: string): unknown => (source instanceof FormData ? source.get(k) : source[k]);
  const rawRating = get("rating");
  return {
    order: str(get("order"), 20).toUpperCase(),
    token: str(get("token"), 64),
    name: str(get("name"), 60),
    rating: typeof rawRating === "number" ? rawRating : Number(typeof rawRating === "string" ? rawRating.trim() : NaN),
    text: str(get("text"), 1000).replace(/\r\n/g, "\n"),
    website: typeof get("website") === "string" ? String(get("website")) : "",
    consent: truthy(get("consent")),
  };
}

export function validateReviewFields(f: ReviewFields): ReviewFieldErrors {
  const errors: ReviewFieldErrors = {};
  if (f.name.length < 2) errors.name = "Bitte gib deinen Namen an (z. B. „Anna M.“).";
  if (!Number.isInteger(f.rating) || f.rating < 1 || f.rating > 5) errors.rating = "Bitte wähle 1 bis 5 Sterne.";
  if (f.text.length < 10) errors.text = "Bitte schreib ein paar Worte (mindestens 10 Zeichen).";
  if (!f.consent) errors.consent = "Bitte bestätige, dass wir deine Bewertung zeigen dürfen.";
  return errors;
}

/** Checks count and sizes of selected photos (browser `File`s or server-side form entries). */
export function photoListError(sizes: readonly number[]): string | null {
  if (sizes.length > MAX_REVIEW_PHOTOS) return `Bitte höchstens ${MAX_REVIEW_PHOTOS} Fotos auswählen.`;
  if (sizes.some((s) => s > MAX_REVIEW_PHOTO_BYTES)) return "Ein Foto ist zu groß (maximal 10 MB pro Foto).";
  if (sizes.some((s) => s <= 0)) return "Ein Foto ist leer.";
  return null;
}

/**
 * The `photos` entries of a multipart form. Empty entries (a file input without a
 * selection sends a nameless 0-byte file) are skipped; text values are ignored.
 */
export function collectReviewPhotos(form: FormData): { files: File[]; error: string | null } {
  const files = form.getAll("photos").filter((v): v is File => typeof v === "object" && v !== null && "arrayBuffer" in v && !(v.size === 0 && !v.name));
  return { files, error: photoListError(files.map((f) => f.size)) };
}

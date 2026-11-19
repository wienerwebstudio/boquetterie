import { NextResponse } from "next/server";
import type { ReviewConsent, ReviewSubmission, ReviewSubmissionPhoto } from "@/types/reminders";
import { getAllProducts, getOrderById, updateOrder } from "@/lib/cms";
import { readFoundVia, type FoundVia } from "@/lib/found-via";
import { enforceRateLimit } from "@/lib/rate-limit";
import { tokenMatches } from "@/lib/mail/reminders";
import { getReviewSubmissions, hasSubmittedReview, markReviewSubmitted, newSubmissionId, saveReviewSubmissions } from "@/lib/mail/review-requests";
import { collectReviewPhotos, MAX_REVIEW_REQUEST_BYTES, readReviewFields, REVIEW_CONSENT_TEXT, validateReviewFields, type ReviewFields } from "@/lib/review-submission";
import { deleteReviewPhoto, processReviewPhoto, storeReviewPhoto, UploadError } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const invalid = () => NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });

/**
 * POST /api/reviews
 * multipart/form-data: order, token, name, rating, text, consent, website (honeypot), photos (0–3 files)
 * (application/json with the same text fields is still accepted, without photos).
 *
 * Stores a customer review as "pending" in data/review-submissions.json. Photos are
 * decoded by their bytes, rotated, stripped of EXIF/GPS, scaled to 1600 px and stored
 * as JPEG (src/lib/uploads.ts). Reviews and photos are never published automatically –
 * an admin accepts them at /admin/bewertungen/eingereicht.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "reviews", limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_REVIEW_REQUEST_BYTES) {
    return NextResponse.json({ ok: false, errors: { photos: "Die Fotos sind zusammen zu groß." }, message: "Die Fotos sind zusammen zu groß." }, { status: 413 });
  }

  let fields: ReviewFields;
  let files: File[] = [];
  let foundVia: FoundVia | null = null;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.startsWith("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return invalid();
    }
    fields = readReviewFields(form);
    foundVia = readFoundVia(form.get("found_via"), form.get("found_via_other"));
    if (fields.website.trim() !== "") return NextResponse.json({ ok: true });
    const photos = collectReviewPhotos(form);
    if (photos.error) return NextResponse.json({ ok: false, errors: { photos: photos.error }, message: photos.error }, { status: 422 });
    files = photos.files;
  } else {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return invalid();
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return invalid();
    fields = readReviewFields(body as Record<string, unknown>);
    foundVia = readFoundVia((body as Record<string, unknown>).found_via, (body as Record<string, unknown>).found_via_other);
    if (fields.website.trim() !== "") return NextResponse.json({ ok: true });
  }

  const errors = validateReviewFields(fields);
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  const order = fields.order ? await getOrderById(fields.order) : null;
  if (!order || !tokenMatches(order.token, fields.token)) {
    return NextResponse.json({ ok: false, message: "Der Link ist ungültig oder abgelaufen." }, { status: 404 });
  }
  if (order.status !== "delivered") {
    return NextResponse.json({ ok: false, message: "Eine Bewertung ist erst nach der Zustellung möglich." }, { status: 409 });
  }
  if (await hasSubmittedReview(order.id)) {
    return NextResponse.json({ ok: false, message: "Für diese Bestellung wurde bereits eine Bewertung abgegeben. Danke!" }, { status: 409 });
  }

  // Decode every photo before storing any, so one bad file stores nothing.
  const processed: { data: Buffer; width: number; height: number }[] = [];
  for (const file of files) {
    try {
      processed.push(await processReviewPhoto(Buffer.from(await file.arrayBuffer())));
    } catch (err) {
      if (err instanceof UploadError) {
        return NextResponse.json({ ok: false, errors: { photos: err.message }, message: err.message }, { status: err.status === 413 ? 413 : 415 });
      }
      console.error("[reviews] photo processing failed", err);
      return NextResponse.json({ ok: false, errors: { photos: "Ein Foto konnte nicht gelesen werden." }, message: "Ein Foto konnte nicht gelesen werden." }, { status: 415 });
    }
  }

  const stored: ReviewSubmissionPhoto[] = [];
  try {
    const products = await getAllProducts(true);
    const productSlug = products.find((p) => p.id === order.lines[0]?.productId)?.slug;
    for (const photo of processed) {
      const saved = await storeReviewPhoto(photo, productSlug ?? "kundenfoto");
      stored.push({ key: saved.key, url: saved.url, width: saved.width, height: saved.height });
    }
    const createdAt = new Date().toISOString();
    const consent: ReviewConsent = { at: createdAt, text: REVIEW_CONSENT_TEXT };
    const submission: ReviewSubmission = {
      id: newSubmissionId(),
      createdAt,
      orderId: order.id,
      ...(productSlug ? { productSlug } : {}),
      name: fields.name,
      rating: fields.rating as ReviewSubmission["rating"],
      text: fields.text,
      ...(stored.length ? { photos: stored } : {}),
      consent,
      // Shop language of the order – the review is shown with "translated from" notes in other languages.
      ...(order.locale && order.locale !== "de" ? { lang: order.locale } : {}),
      status: "pending",
    };
    const list = await getReviewSubmissions();
    list.push(submission);
    await saveReviewSubmissions(list);
    await markReviewSubmitted(order.id, createdAt, consent);
    if (foundVia) {
      const answer = foundVia;
      await updateOrder(order.id, (o) => ({ ...o, foundVia: answer })).catch((err: unknown) => console.warn("[reviews] found-via not stored", err));
    }
    return NextResponse.json({ ok: true, photos: stored.length }, { status: 201 });
  } catch (err) {
    console.error("[reviews] store failed", err);
    await Promise.all(stored.map((p) => deleteReviewPhoto(p.key).catch(() => undefined)));
    return NextResponse.json({ ok: false, message: "Die Bewertung konnte gerade nicht gespeichert werden. Bitte versuch es in einem Moment noch einmal." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import type { CustomRequest } from "@/types";
import { getAllProducts, getCustomRequests, getSettings } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";
import { enforceRateLimit } from "@/lib/rate-limit";
import { inquiryUnavailable } from "@/lib/inquiries";
import { addCustomRequest, newCustomRequestId } from "@/lib/custom-requests";
import { isValidProductSlug, MAX_REQUEST_BODY_BYTES, readCustomRequestFields, validateCustomRequest, type CustomRequestErrorKey, type CustomRequestFields } from "@/lib/custom-requests-core";
import { sendCustomRequestMails } from "@/lib/mail";
import { publicSiteUrl } from "@/lib/offers";
import { HEIC_MESSAGE, processRequestPhoto, storeRequestPhoto, UploadError } from "@/lib/uploads";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const invalid = () => NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
const photoError = (key: CustomRequestErrorKey, status: number) => NextResponse.json({ ok: false, errors: { photo: key } }, { status });

/**
 * POST /api/custom-request – the form on /anfrage (see docs/INQUIRIES.md).
 * multipart/form-data: name, email, phone?, topics (0–6×), product?, date?, time?, flexible?,
 * place?, budget?, message, consent, locale, website (honeypot), photo? (one image).
 * JSON with the same text fields is accepted too (no photo).
 *
 * Order of checks: rate limit → body size → fields → photo (decoded only now). The request is
 * stored (document `custom-requests`), the customer gets a confirmation in their language and
 * MAIL_ADMIN a notification with the photo. Stored OR mailed counts as delivered (like the
 * contact form); otherwise 503 with the public address for a mailto fallback.
 * Error answers carry keys of `inquiry.errors` – the form translates them.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "custom-request", limit: 6, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BODY_BYTES) return photoError("photoSize", 413);

  let fields: CustomRequestFields;
  let file: File | null = null;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.startsWith("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return invalid();
    }
    fields = readCustomRequestFields(form);
    const photo = form.get("photo");
    if (photo instanceof File && photo.size > 0) file = photo;
    if (form.getAll("photo").filter((p) => p instanceof File && p.size > 0).length > 1) return invalid();
  } else {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return invalid();
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return invalid();
    fields = readCustomRequestFields(body as Record<string, unknown>);
  }

  // Honeypot: bots fill the hidden field – pretend success without storing anything.
  if (fields.website.trim() !== "") return NextResponse.json({ ok: true });

  const settings = await getSettings();
  const errors = validateCustomRequest(fields, getLocalNow(settings.timezone).date);
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  // Only real, active shop products are kept (unknown slugs are dropped, not an error).
  let product: CustomRequest["product"];
  if (fields.productSlug && isValidProductSlug(fields.productSlug)) {
    const p = (await getAllProducts()).find((x) => x.slug === fields.productSlug && x.active);
    if (p) product = { slug: p.slug, name: p.name };
  }

  let processed: { data: Buffer; width: number; height: number } | null = null;
  if (file) {
    try {
      processed = await processRequestPhoto(Buffer.from(await file.arrayBuffer()));
    } catch (err) {
      if (err instanceof UploadError) {
        if (err.status === 413) return photoError("photoSize", 413);
        return photoError(err.message === HEIC_MESSAGE ? "photoHeic" : "photoType", 415);
      }
      console.error("[custom-request] photo processing failed", err);
      return photoError("photoType", 415);
    }
  }

  let existing = new Set<string>();
  try {
    existing = new Set((await getCustomRequests()).map((r) => r.id));
  } catch { /* store unreadable – a random id is still fine */ }
  const id = newCustomRequestId(existing);
  const now = new Date().toISOString();

  let photo: CustomRequest["photo"];
  if (processed) {
    try {
      const saved = await storeRequestPhoto(processed, id);
      photo = { url: saved.url, key: saved.key, width: saved.width, height: saved.height };
    } catch (err) {
      // The photo still goes to the team as an attachment.
      console.error("[custom-request] photo could not be stored", err);
    }
  }

  const request: CustomRequest = {
    id,
    createdAt: now,
    locale: isLocale(fields.locale) ? fields.locale : "de",
    status: "new",
    name: fields.name,
    email: fields.email.toLowerCase(),
    ...(fields.phone && { phone: fields.phone }),
    topics: fields.topics,
    ...(product && { product }),
    ...(fields.date && { date: fields.date }),
    ...(fields.time && { time: fields.time }),
    flexible: fields.flexible,
    ...(fields.place && { place: fields.place }),
    ...(fields.budget && { budget: fields.budget }),
    message: fields.message,
    ...(photo && { photo }),
    consentAt: now,
    history: [{ at: now, note: "Anfrage eingegangen" }],
  };

  let stored = false;
  try {
    await addCustomRequest(request);
    stored = true;
  } catch (err) {
    console.error("[custom-request] could not store request", err);
  }

  let mailed = false;
  try {
    const { admin } = await sendCustomRequestMails(request, { siteUrl: await publicSiteUrl(), photo: processed?.data });
    mailed = admin?.sent === true;
  } catch (err) {
    console.error("[custom-request] mails failed", err);
  }
  if (!stored && !mailed) return inquiryUnavailable();

  return NextResponse.json({ ok: true, id });
}

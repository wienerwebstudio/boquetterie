import { NextResponse } from "next/server";
import type { ReviewSubmission } from "@/types/reminders";
import { getAllProducts, getOrderById } from "@/lib/cms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { tokenMatches } from "@/lib/mail/reminders";
import { getReviewSubmissions, hasSubmittedReview, markReviewSubmitted, newSubmissionId, saveReviewSubmissions } from "@/lib/mail/review-requests";

export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * POST /api/reviews
 * Body: { order, token, name, rating, text, website? }
 * Stores a customer review as "pending" in data/review-submissions.json. Reviews
 * are never published automatically – an admin accepts them at
 * /admin/bewertungen/eingereicht.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "reviews", limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") throw new Error("bad body");
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const orderId = str(body.order, 20).toUpperCase();
  const token = str(body.token, 64);
  const name = str(body.name, 60);
  const text = str(body.text, 1000).replace(/\r\n/g, "\n");
  const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Bitte gib deinen Namen an (z. B. „Anna M.“).";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = "Bitte wähle 1 bis 5 Sterne.";
  if (text.length < 10) errors.text = "Bitte schreib ein paar Worte (mindestens 10 Zeichen).";
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  const order = orderId ? await getOrderById(orderId) : null;
  if (!order || !tokenMatches(order.token, token)) {
    return NextResponse.json({ ok: false, message: "Der Link ist ungültig oder abgelaufen." }, { status: 404 });
  }
  if (order.status !== "delivered") {
    return NextResponse.json({ ok: false, message: "Eine Bewertung ist erst nach der Zustellung möglich." }, { status: 409 });
  }
  if (await hasSubmittedReview(order.id)) {
    return NextResponse.json({ ok: false, message: "Für diese Bestellung wurde bereits eine Bewertung abgegeben. Danke!" }, { status: 409 });
  }

  try {
    const products = await getAllProducts(true);
    const productSlug = products.find((p) => p.id === order.lines[0]?.productId)?.slug;
    const submission: ReviewSubmission = {
      id: newSubmissionId(),
      createdAt: new Date().toISOString(),
      orderId: order.id,
      ...(productSlug ? { productSlug } : {}),
      name,
      rating: rating as ReviewSubmission["rating"],
      text,
      status: "pending",
    };
    const list = await getReviewSubmissions();
    list.push(submission);
    await saveReviewSubmissions(list);
    await markReviewSubmitted(order.id, submission.createdAt);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[reviews] store failed", err);
    return NextResponse.json({ ok: false, message: "Die Bewertung konnte gerade nicht gespeichert werden. Bitte versuch es in einem Moment noch einmal." }, { status: 500 });
  }
}

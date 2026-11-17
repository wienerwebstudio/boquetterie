"use server";

import { revalidatePath } from "next/cache";
import type { Review } from "@/types";
import { getAllProducts, readCollection, writeCollection } from "@/lib/cms";
import { requireAdmin } from "@/lib/admin-session";
import { getReviewSubmissions, saveReviewSubmissions, submissionToReview } from "@/lib/mail/review-requests";
import { deleteReviewPhoto } from "@/lib/uploads";

function revalidate() {
  revalidatePath("/admin/bewertungen/eingereicht");
  revalidatePath("/admin/bewertungen");
  revalidatePath("/", "layout");
}

function nextReviewId(reviews: Review[]) {
  const max = reviews.reduce((m, r) => {
    const n = /^r(\d+)$/.exec(r.id);
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `r${max + 1}`;
}

/** Deletes stored photos that will not be published (errors are logged, never block the admin). */
async function dropPhotos(keys: string[]) {
  await Promise.all(keys.map((key) => deleteReviewPhoto(key).catch((err) => console.error("[reviews] photo delete failed", key, err))));
}

/**
 * Moves a pending submission into content/reviews.json (demo:false, verified:true).
 * Only the photos whose checkbox (`photo` = storage key) is ticked are published;
 * the others are deleted from storage.
 */
export async function acceptSubmission(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const submissions = await getReviewSubmissions();
  const submission = submissions.find((s) => s.id === id);
  if (!submission) return;

  const own = new Set((submission.photos ?? []).map((p) => p.key));
  const approved = formData.getAll("photo").map(String).filter((key) => own.has(key));
  const products = await getAllProducts(true);
  const productName = products.find((p) => p.slug === submission.productSlug)?.name ?? null;

  const reviews = await readCollection<Review[]>("reviews");
  reviews.push(submissionToReview(submission, nextReviewId(reviews), { photoKeys: approved, productName }));
  await writeCollection("reviews", reviews);
  await saveReviewSubmissions(submissions.filter((s) => s.id !== id));
  await dropPhotos([...own].filter((key) => !approved.includes(key)));
  revalidate();
}

/** Discards a pending submission without publishing it (its photos are deleted). */
export async function rejectSubmission(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const submissions = await getReviewSubmissions();
  const submission = submissions.find((s) => s.id === id);
  if (!submission) return;
  await saveReviewSubmissions(submissions.filter((s) => s.id !== id));
  await dropPhotos((submission.photos ?? []).map((p) => p.key));
  revalidate();
}

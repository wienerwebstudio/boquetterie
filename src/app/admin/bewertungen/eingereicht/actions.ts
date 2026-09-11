"use server";

import { revalidatePath } from "next/cache";
import type { Review } from "@/types";
import { readCollection, writeCollection } from "@/lib/cms";
import { requireAdmin } from "@/lib/admin-session";
import { getReviewSubmissions, saveReviewSubmissions, submissionToReview } from "@/lib/mail/review-requests";

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

/** Moves a pending submission into content/reviews.json (demo:false, verified:true). */
export async function acceptSubmission(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const submissions = await getReviewSubmissions();
  const submission = submissions.find((s) => s.id === id);
  if (!submission) return;

  const reviews = await readCollection<Review[]>("reviews");
  reviews.push(submissionToReview(submission, nextReviewId(reviews)));
  await writeCollection("reviews", reviews);
  await saveReviewSubmissions(submissions.filter((s) => s.id !== id));
  revalidate();
}

/** Discards a pending submission without publishing it. */
export async function rejectSubmission(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const submissions = await getReviewSubmissions();
  if (!submissions.some((s) => s.id === id)) return;
  await saveReviewSubmissions(submissions.filter((s) => s.id !== id));
  revalidate();
}

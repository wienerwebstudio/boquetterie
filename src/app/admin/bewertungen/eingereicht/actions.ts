"use server";

import { revalidatePath } from "next/cache";
import type { Review } from "@/types";
import { getAllProducts, readCollection, writeCollection } from "@/lib/cms";
import { requireAdmin } from "@/lib/admin-session";
import { getReviewSubmissions, saveReviewSubmissions, submissionToReview } from "@/lib/mail/review-requests";
import type { ReviewSubmission } from "@/types/reminders";
import { deleteReviewPhoto, deleteReviewVideo, readReviewVideoManifest, writeReviewVideoManifest } from "@/lib/uploads";

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

/** Deletes a video that will not be published: its chunks, manifest and poster. */
async function dropVideo(video: ReviewSubmission["video"]) {
  if (!video) return;
  await deleteReviewVideo(video.id).catch((err) => console.error("[reviews] video delete failed", video.id, err));
  // The poster is a review photo; deleteReviewVideo removes it via the manifest – this covers a lost manifest.
  await deleteReviewPhoto(video.posterKey).catch(() => undefined);
}

/** Makes an accepted video publicly playable (the `/media` route checks the manifest). */
async function approveVideo(id: string) {
  const manifest = await readReviewVideoManifest(id);
  if (!manifest) return false;
  await writeReviewVideoManifest({ ...manifest, status: "approved" });
  return true;
}

/**
 * Moves a pending submission into content/reviews.json (demo:false, verified:true).
 * Only the photos whose checkbox (`photo` = storage key) is ticked are published;
 * the others are deleted from storage. The same for the video (`video` = upload id).
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

  const videoApproved = Boolean(submission.video) && formData.get("video") === submission.video?.id && (await approveVideo(submission.video!.id));

  const reviews = await readCollection<Review[]>("reviews");
  reviews.push(submissionToReview(submission, nextReviewId(reviews), { photoKeys: approved, video: videoApproved, productName }));
  await writeCollection("reviews", reviews);
  await saveReviewSubmissions(submissions.filter((s) => s.id !== id));
  await dropPhotos([...own].filter((key) => !approved.includes(key)));
  if (!videoApproved) await dropVideo(submission.video);
  revalidate();
}

/** Discards a pending submission without publishing it (its photos and video are deleted). */
export async function rejectSubmission(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const submissions = await getReviewSubmissions();
  const submission = submissions.find((s) => s.id === id);
  if (!submission) return;
  await saveReviewSubmissions(submissions.filter((s) => s.id !== id));
  await dropPhotos((submission.photos ?? []).map((p) => p.key));
  await dropVideo(submission.video);
  revalidate();
}

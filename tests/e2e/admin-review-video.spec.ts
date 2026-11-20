import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, request as playwrightRequest, test } from "@playwright/test";
import { ADMIN_PASSWORD, dismissConsent } from "./helpers";

/**
 * Admin review editor: the owners upload a customer clip themselves (e.g. sent via
 * WhatsApp). The browser reads length and poster frame, uploads in chunks, the form
 * fills the video fields; after „Speichern“ the video is public on the product page.
 * „Video entfernen“ takes it out of the review again.
 *
 * Needs the JSON store and the local upload driver. content/reviews.json is tracked
 * (no fixture overlay for reviews) – the original bytes are restored afterwards, and
 * the uploaded files below public/uploads are deleted.
 */

const REVIEW_ID = "e2e-admin-video";
const NAME = "Viktor V.";
const PRODUCT = { slug: "solstice", name: "Solstice" };
const CLIP = path.resolve(process.cwd(), "tests/fixtures/media/review-clip.webm");
const REVIEWS = path.resolve(process.cwd(), "content/reviews.json");
const UPLOADS = path.resolve(process.cwd(), "public/uploads");

type StoredReview = { id: string; video?: { src: string; poster: string; alt: string; duration?: number; width?: number; height?: number } };

let original: string | null = null;
const uploaded = new Set<string>();

async function readReviews(): Promise<StoredReview[]> {
  return JSON.parse(await readFile(REVIEWS, "utf8")) as StoredReview[];
}

test.describe("Admin: Kundenvideo hochladen", () => {
  test.skip(Boolean(process.env.DATABASE_URL), "needs the JSON store");
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    const raw = await readFile(REVIEWS, "utf8");
    const reviews = (JSON.parse(raw) as StoredReview[]).filter((r) => r.id !== REVIEW_ID);
    // Restore the exact bytes – minus a leftover entry of an aborted earlier run.
    original = reviews.length === (JSON.parse(raw) as StoredReview[]).length ? raw : JSON.stringify(reviews, null, 2) + "\n";
    reviews.push({
      id: REVIEW_ID,
      name: NAME,
      rating: 5,
      text: "Der Strauß war noch schöner als auf den Fotos.",
      productSlug: PRODUCT.slug,
      date: "2026-11-15",
      verified: true,
      demo: false,
    } as StoredReview);
    await writeFile(REVIEWS, JSON.stringify(reviews, null, 2) + "\n", "utf8");
  });

  test.afterAll(async () => {
    if (original !== null) await writeFile(REVIEWS, original, "utf8");
    for (const key of uploaded) await rm(path.join(UPLOADS, key), { recursive: true, force: true });
  });

  test("Video hochladen, speichern, im Shop sichtbar, wieder entfernen", async ({ page, baseURL }) => {
    test.slow();
    await page.goto(`/admin/login?next=${encodeURIComponent(`/admin/bewertungen/${REVIEW_ID}`)}`);
    await page.locator("input#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
    await expect(page.getByRole("button", { name: "Video hochladen" })).toBeVisible();
    await expect(page.getByTestId("admin-review-video-preview")).toHaveCount(0);

    // Through the button like the owners do; retried until the form is hydrated (the click opens the file dialog).
    await expect(async () => {
      const chooser = page.waitForEvent("filechooser", { timeout: 2_000 });
      await page.getByRole("button", { name: "Video hochladen" }).click();
      await (await chooser).setFiles(CLIP);
    }).toPass({ timeout: 30_000 });
    const preview = page.getByTestId("admin-review-video-preview");
    await expect(preview).toBeVisible({ timeout: 30_000 });
    const src = (await preview.getAttribute("src")) ?? "";
    expect(src).toMatch(/^\/media\/review-videos\/[a-f0-9]{24}\/video\.webm$/);
    uploaded.add(src.replace(/^\/media\//, "").replace(/\/video\.webm$/, ""));
    await expect(page.getByTestId("admin-review-video-details")).toHaveText("Länge 0:01 · 180 × 320 px");

    // The sibling fields are filled from the upload.
    const duration = Number(await page.getByLabel("Länge (Sekunden)").inputValue());
    expect(duration).toBeGreaterThan(1);
    expect(duration).toBeLessThan(1.5);
    await expect(page.getByLabel("Alternativtext").last()).toHaveValue(`Kundenvideo zu ${PRODUCT.name}`);
    await expect(page.getByLabel("Breite (px)")).toHaveValue("180");
    await expect(page.getByLabel("Höhe (px)")).toHaveValue("320");
    const posterValue = await page.locator("input[placeholder='/images/…/bild.jpg oder /uploads/…']").last().inputValue();
    expect(posterValue).toMatch(/^\/(media|uploads)\/reviews\/\d{4}\/\d{2}\/solstice-video-[a-f0-9]{8}\.jpg$/);
    uploaded.add(posterValue.replace(/^\/(media|uploads)\//, ""));

    // The preview really plays the uploaded file.
    const decodedWidth = await preview.evaluate(async (el: HTMLVideoElement) => {
      if (el.readyState < 1) {
        await new Promise((resolve, reject) => {
          el.addEventListener("loadedmetadata", resolve, { once: true });
          el.addEventListener("error", () => reject(new Error("video error")), { once: true });
        });
      }
      return el.videoWidth;
    });
    expect(decodedWidth).toBe(180);

    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Gespeichert. Der Shop zeigt die Änderung sofort.")).toBeVisible({ timeout: 20_000 });
    const saved = (await readReviews()).find((r) => r.id === REVIEW_ID);
    expect(saved?.video).toMatchObject({ src, poster: posterValue, alt: `Kundenvideo zu ${PRODUCT.name}`, width: 180, height: 320 });

    // Public without the admin cookie (HTTP Range) …
    const anonymous = await playwrightRequest.newContext({ baseURL });
    const range = await anonymous.get(src, { headers: { Range: "bytes=0-3" } });
    expect(range.status()).toBe(206);
    expect([...(await range.body())]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
    expect((await anonymous.get(posterValue)).status()).toBe(200);
    await anonymous.dispose();

    // … and shown under the review on the product page.
    const shop = await page.context().browser()!.newPage({ baseURL });
    await shop.goto(`/produkt/${PRODUCT.slug}`, { waitUntil: "domcontentloaded" });
    await dismissConsent(shop);
    await expect(shop.locator(`video[src="${src}"]`)).toHaveAttribute("poster", posterValue);
    await shop.close();

    // „Video entfernen“ clears the fields; saving removes the video from the review.
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Video entfernen" }).click();
    await expect(preview).toHaveCount(0);
    await expect(page.getByLabel("Länge (Sekunden)")).toHaveValue("");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Gespeichert. Der Shop zeigt die Änderung sofort.")).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await readReviews()).find((r) => r.id === REVIEW_ID)?.video).toBeUndefined();
  });
});

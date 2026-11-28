import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, request as playwrightRequest, test } from "@playwright/test";
import { ADMIN_PASSWORD, dismissConsent } from "./helpers";

/**
 * Review with a short video: the customer picks a clip on /bewertung (duration and
 * poster are read in the browser), the form uploads it in chunks, the admin sees it
 * under „Eingereichte Bewertungen“ – playable only for the admin, with HTTP Range –
 * and „Verwerfen“ deletes it again.
 *
 * Needs the JSON store (DATABASE_URL empty): a delivered order is written to
 * data/orders.json. Accepting is not exercised here because it writes content/reviews.json
 * (covered by the unit tests).
 */

const ORDER_ID = "BQ-E2EV1D";
const TOKEN = "e2e0video0token0e2e0vid0";
const NAME = "Vera V.";
const CLIP = path.resolve(process.cwd(), "tests/fixtures/media/review-clip.webm");
const DATA = path.resolve(process.cwd(), "data");

async function readList<T>(name: string): Promise<T[]> {
  try {
    return JSON.parse(await readFile(path.join(DATA, `${name}.json`), "utf8")) as T[];
  } catch {
    return [];
  }
}
const writeList = (name: string, list: unknown[]) => writeFile(path.join(DATA, `${name}.json`), JSON.stringify(list, null, 2) + "\n", "utf8");

test.describe("Bewertung mit Video", () => {
  test.skip(Boolean(process.env.DATABASE_URL), "needs the JSON store");

  test.beforeAll(async () => {
    const orders = (await readList<{ id: string }>("orders")).filter((o) => o.id !== ORDER_ID);
    const at = "2026-11-15T10:00:00.000Z";
    orders.unshift({
      id: ORDER_ID,
      token: TOKEN,
      createdAt: "2026-11-14T09:00:00.000Z",
      status: "delivered",
      history: [{ status: "paid", at: "2026-11-14T09:00:00.000Z" }, { status: "delivered", at }],
      recipient: { firstName: "Eva", lastName: "Empfang", street: "Wiedner Hauptstraße", houseNumber: "12", zip: "1040", city: "Wien", phone: "+43 664 1234567" },
      delivery: { date: "2026-11-15", zoneId: "wien-zentrum", zoneName: "Wien Zentrum", fee: 0 },
      customer: { firstName: "Vera", lastName: "Video", email: "vera.video@example.com", phone: "" },
      lines: [{ productId: "p-amour", productName: "Amour", quantity: 1, unitPrice: 59, extras: [] }],
      totals: { subtotal: 59, extras: 0, delivery: 0, discount: 0, total: 59 },
      payment: { method: "card", status: "paid", provider: "mock" },
      locale: "de",
    } as { id: string });
    await writeList("orders", orders);
  });

  test.afterAll(async () => {
    await writeList("orders", (await readList<{ id: string }>("orders")).filter((o) => o.id !== ORDER_ID));
    await writeList("review-requests", (await readList<{ orderId: string }>("review-requests")).filter((r) => r.orderId !== ORDER_ID));
    await writeList("review-submissions", (await readList<{ orderId: string }>("review-submissions")).filter((r) => r.orderId !== ORDER_ID));
  });

  test("Kund:in lädt ein Video hoch, nur der Admin kann es abspielen, Verwerfen löscht es", async ({ page, baseURL }) => {
    test.slow();
    await page.goto(`/bewertung?order=${ORDER_ID}&token=${TOKEN}`, { waitUntil: "domcontentloaded" });
    await dismissConsent(page);
    const form = page.getByRole("form", { name: "Bewertung schreiben" });
    await expect(form).toBeVisible();

    await form.getByRole("radio", { name: /5 von 5 Sternen/ }).click();
    await form.getByLabel("Dein Name").fill(NAME);
    await form.getByLabel("Wie war der Strauß?").fill("Wunderschöne Blumen, und das Video zeigt sie am besten.");
    await expect(form.getByText(/höchstens 15 Sekunden/)).toBeVisible();

    // Hidden file input behind the „Video hinzufügen“ button.
    await form.locator("#review-video").setInputFiles(CLIP);
    const preview = form.getByRole("img", { name: "Vorschaubild des Videos „review-clip.webm“" });
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await expect(form.getByText("Länge 0:01")).toBeVisible();
    // The poster is a real JPEG frame drawn from the clip.
    expect(await preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(180);

    await form.getByRole("checkbox", { name: /Ich bin einverstanden/ }).check();
    await form.getByRole("button", { name: "Bewertung absenden" }).click();
    await expect(page.getByRole("heading", { name: "Danke für deine Bewertung." })).toBeVisible({ timeout: 30_000 });

    const [submission] = (await readList<{ orderId: string; video?: { url: string; bytes: number; duration: number; contentType: string } }>("review-submissions")).filter((s) => s.orderId === ORDER_ID);
    expect(submission?.video).toMatchObject({ contentType: "video/webm", bytes: 24_652 });
    expect(submission.video!.duration).toBeGreaterThan(1);
    expect(submission.video!.duration).toBeLessThan(1.5);
    const videoUrl = submission.video!.url;
    expect(videoUrl).toMatch(/^\/media\/review-videos\/[a-f0-9]{24}\/video\.webm$/);

    // Not public before the admin decides.
    const anonymous = await playwrightRequest.newContext({ baseURL });
    expect((await anonymous.get(videoUrl, { headers: { Range: "bytes=0-1" } })).status()).toBe(404);

    /* ---- Admin ---- */
    await page.goto("/admin/login?next=%2Fadmin%2Fbewertungen%2Feingereicht");
    await page.locator("input#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Eingereichte Bewertungen" })).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: NAME });
    const video = row.getByTestId("pending-review-video");
    await expect(video).toHaveAttribute("src", videoUrl);
    await expect(row.getByRole("checkbox", { name: "Video zeigen" })).toBeChecked();

    // The admin's browser gets byte ranges (Safari needs them) …
    const range = await page.request.get(videoUrl, { headers: { Range: "bytes=0-3" } });
    expect(range.status()).toBe(206);
    expect(range.headers()["content-range"]).toBe("bytes 0-3/24652");
    expect([...(await range.body())]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
    // … and the player really decodes the clip.
    const decodedWidth = await video.evaluate(async (el: HTMLVideoElement) => {
      el.preload = "metadata";
      el.load();
      await new Promise((resolve, reject) => {
        el.addEventListener("loadedmetadata", resolve, { once: true });
        el.addEventListener("error", () => reject(new Error("video error")), { once: true });
      });
      return el.videoWidth;
    });
    expect(decodedWidth).toBe(180);

    await row.getByRole("button", { name: "Verwerfen" }).click();
    await expect(page.getByRole("row").filter({ hasText: NAME })).toHaveCount(0);
    expect((await page.request.get(videoUrl, { headers: { Range: "bytes=0-1" } })).status()).toBe(404);
    await anonymous.dispose();
  });
});

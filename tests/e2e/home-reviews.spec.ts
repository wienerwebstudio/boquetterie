import { expect, test, type Locator, type Page } from "@playwright/test";
import { gotoPage } from "./helpers";

/**
 * Homepage reviews: every review in one horizontal row (newest first), equal compact
 * tiles, long text scrolls inside its tile, arrows on desktop (mirrored in RTL), and a
 * sideways swipe that starts on the text still moves the row.
 *
 * Needs the fixture overlay (CONTENT_OVERLAY_DIR=tests/fixtures/content): 9 reviews,
 * "Lukas P." has the long text, "Martin S." is the oldest. admin-review-video.spec.ts
 * adds one review for a while (and the cached homepage may still show it), so counts
 * are lower bounds and the order is checked by date.
 */
const FIXTURE_COUNT = 9;

test.skip(!process.env.CONTENT_OVERLAY_DIR, "needs the fixture reviews (CONTENT_OVERLAY_DIR=tests/fixtures/content)");

const section = (page: Page) => page.locator("#bewertungen");
const tiles = (page: Page) => section(page).locator("[data-review-tile]");
const row = (page: Page) => section(page).locator("[data-review-row]");
const longText = (page: Page) => tiles(page).filter({ hasText: "Lukas P." }).locator("[data-review-text]");

async function open(page: Page, path: string) {
  await gotoPage(page, path);
  await section(page).scrollIntoViewIfNeeded();
  // Hydrated: the client box has measured the long text.
  await expect(longText(page)).toHaveAttribute("data-more", "");
}

async function heights(list: Locator) {
  return list.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
}

async function noHorizontalOverflow(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, "page must not scroll sideways").toBeLessThanOrEqual(client);
}

test.describe("Startseite – Bewertungen", () => {
  test("zeigt alle Bewertungen, neueste zuerst, in gleich hohen Kacheln", async ({ page }, testInfo) => {
    await open(page, "/");
    expect(await tiles(page).count()).toBeGreaterThanOrEqual(FIXTURE_COUNT);
    expect(FIXTURE_COUNT).toBeGreaterThan(6);
    const dates = await tiles(page).locator("time").evaluateAll((els) => els.map((e) => e.getAttribute("datetime") ?? ""));
    expect(dates, "newest first").toEqual([...dates].sort().reverse());
    await expect(tiles(page).last()).toContainText("Martin S.");
    await expect(tiles(page).filter({ hasText: "Emre Y." })).toHaveCount(1);

    const h = await heights(tiles(page));
    expect(new Set(h).size, `tile heights ${h.join(",")}`).toBe(1);
    expect(h[0]).toBeGreaterThanOrEqual(22 * 16);
    expect(h[0]).toBeLessThanOrEqual(26 * 16);
    await section(page).screenshot({ path: testInfo.outputPath("reviews-1280.png") });

    // Translation note, photos and video stay in their tiles.
    await expect(tiles(page).filter({ hasText: "James W." })).toContainText("Übersetzt aus");
    await expect(tiles(page).filter({ hasText: "Sophie M." }).getByRole("button", { name: /Kundenfoto/ })).toHaveCount(2);
    await expect(tiles(page).filter({ hasText: "Clara B." }).locator("video")).toHaveCount(1);
    await expect(tiles(page).filter({ hasText: "Lukas P." })).toContainText("Verifizierter Kauf");

    // Long text: scrollable box inside the tile, focusable, fade until the end.
    const box = longText(page);
    await expect(box).toHaveAttribute("tabindex", "0");
    await expect(box).toHaveAttribute("aria-label", "Bewertung von Lukas P.");
    const m = await box.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, oy: getComputedStyle(el).overflowY }));
    expect(m.oy).toBe("auto");
    expect(m.sh).toBeGreaterThan(m.ch);
    await box.focus();
    await page.keyboard.press("End");
    await expect(box).not.toHaveAttribute("data-more", "");
    // A short text is not a tab stop.
    await expect(tiles(page).filter({ hasText: "Paul H." }).locator("[data-review-text]")).not.toHaveAttribute("tabindex", /.*/);

  });

  test("Pfeile blättern bis zur ältesten Bewertung und sind an den Enden deaktiviert", async ({ page }) => {
    await open(page, "/");
    const prev = section(page).getByRole("button", { name: "Vorherige Bewertungen" });
    const next = section(page).getByRole("button", { name: "Nächste Bewertungen" });
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
    for (let i = 0; i < FIXTURE_COUNT && (await next.isEnabled()); i++) {
      await next.click();
      await page.waitForTimeout(600);
    }
    await expect(next).toBeDisabled();
    await expect(prev).toBeEnabled();
    await expect(tiles(page).last()).toBeInViewport({ ratio: 0.9 });
    await prev.click();
    await expect(next).toBeEnabled();
  });

  test("RTL (ar): Zeile und Pfeile gespiegelt", async ({ page }, testInfo) => {
    await open(page, "/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(await tiles(page).count()).toBeGreaterThanOrEqual(FIXTURE_COUNT);
    const [prev, next] = [section(page).locator("[data-review-prev]"), section(page).locator("[data-review-next]")];
    await expect(prev).toBeDisabled();
    // First tile sits at the right edge of the row in RTL.
    const r = await row(page).boundingBox();
    const first = await tiles(page).first().boundingBox();
    expect(first!.x + first!.width).toBeGreaterThan(r!.x + r!.width - 2);
    await next.click();
    await expect(prev).toBeEnabled();
    await expect.poll(() => row(page).evaluate((el) => el.scrollLeft)).toBeLessThan(0);
    await noHorizontalOverflow(page);
    await section(page).screenshot({ path: testInfo.outputPath("reviews-1280-rtl.png") });
  });
});

test.describe("Startseite – Bewertungen mobil", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("390px: eine Zeile ohne seitlichen Überlauf, gleich hohe Kacheln, keine Pfeile", async ({ page }, testInfo) => {
    await open(page, "/");
    expect(await tiles(page).count()).toBeGreaterThanOrEqual(FIXTURE_COUNT);
    const h = await heights(tiles(page));
    expect(new Set(h).size, `tile heights ${h.join(",")}`).toBe(1);
    const tops = await tiles(page).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size, "all tiles in one row").toBe(1);
    await expect(section(page).locator("[data-review-next]")).toBeHidden();
    await noHorizontalOverflow(page);
    await section(page).screenshot({ path: testInfo.outputPath("reviews-390.png") });
  });

  test("390px RTL: kein seitlicher Überlauf", async ({ page }, testInfo) => {
    await open(page, "/ar");
    await noHorizontalOverflow(page);
    await section(page).screenshot({ path: testInfo.outputPath("reviews-390-rtl.png") });
  });

  test("Wischen auf dem Text: senkrecht scrollt den Text, seitlich die Zeile", async ({ page }) => {
    await open(page, "/");
    const tile = tiles(page).filter({ hasText: "Lukas P." });
    await tile.evaluate((el) => el.scrollIntoView({ block: "center", inline: "start" }));
    await page.waitForTimeout(300);
    const box = longText(page);
    const b = (await box.boundingBox())!;
    const x = Math.round(b.x + b.width / 2);
    const y = Math.round(b.y + b.height / 2);
    // Real touch sequence (CDP): the browser decides which scroller takes the pan.
    const cdp = await page.context().newCDPSession(page);
    const swipe = async (dx: number, dy: number) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 10; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * i) / 10, y: y + (dy * i) / 10 }] });
        await page.waitForTimeout(16);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };

    const rowBefore = await row(page).evaluate((el) => el.scrollLeft);
    const pageBefore = await page.evaluate(() => window.scrollY);
    await swipe(0, -120);
    await expect.poll(() => box.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await row(page).evaluate((el) => el.scrollLeft)).toBe(rowBefore);
    expect(await page.evaluate(() => window.scrollY), "vertical pan stays in the text box").toBe(pageBefore);

    await swipe(-200, 0);
    await expect.poll(() => row(page).evaluate((el) => el.scrollLeft)).toBeGreaterThan(rowBefore);
  });
});

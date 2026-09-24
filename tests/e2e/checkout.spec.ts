import { expect, test } from "@playwright/test";
import { PLZ_SERVED, addAmourToCart } from "./helpers";

/**
 * Full purchase. Written against the mock payment flow (radio "Kreditkarte" +
 * "Jetzt kaufen"); if a hosted payment element (Stripe) is mounted instead, the
 * payment step is not asserted beyond reaching it. Only stable outcomes are checked:
 * the order URL pattern and the confirmation headline.
 */
test.describe("Checkout @slow", () => {
  test("Bestellung mit Mock-Zahlung landet auf der Bestellseite", async ({ page }) => {
    test.slow();
    await addAmourToCart(page);
    await page.getByRole("dialog", { name: /Warenkorb/ }).getByRole("link", { name: /Sicher zur Kasse/ }).click();
    await expect(page).toHaveURL(/\/checkout/);

    /* ---- Schritt 1: Empfänger ---- */
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wohin dürfen wir liefern?");
    await page.getByLabel("Vorname").fill("Anna");
    await page.getByLabel("Nachname").fill("Huber");
    await page.getByLabel("Straße").fill("Wiedner Hauptstraße");
    await page.getByLabel("Hausnummer").fill("12");
    const zip = page.getByLabel("PLZ");
    if ((await zip.inputValue()) !== PLZ_SERVED) await zip.fill(PLZ_SERVED);
    await expect(page.getByLabel("Ort")).toHaveValue("Wien");
    await page.getByLabel("Telefonnummer für die Zustellung").fill("+43 664 1234567");
    await expect(page.getByText(/Lieferung möglich/)).toBeVisible();
    await page.getByRole("button", { name: "Weiter" }).click();

    /* ---- Schritt 2: Lieferung ---- */
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wann soll der Strauß ankommen?");
    // The radios are visually hidden (sr-only) – click their tile labels instead.
    const dates = page.getByRole("radiogroup", { name: "Lieferdatum" });
    const firstDate = dates.getByRole("radio").first();
    await expect(firstDate).toBeAttached();
    if (!(await firstDate.isChecked())) await dates.locator("label").first().click();
    await expect(firstDate).toBeChecked();
    const windows = page.getByRole("radiogroup", { name: "Lieferzeitfenster" });
    await windows.locator("label").first().click();
    await expect(windows.getByRole("radio").first()).toBeChecked();
    await expect(page.getByText(/^Lieferung am/)).toBeVisible();
    await page.getByRole("button", { name: "Weiter" }).click();

    /* ---- Schritt 3: Grußkarte ---- */
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Deine Worte auf der Karte");
    await page.getByLabel("Deine Nachricht").fill("Viel Freude mit den Blumen!");
    await page.getByRole("button", { name: "Weiter" }).click();

    /* ---- Schritt 4: Besteller ---- */
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Deine Kontaktdaten");
    await page.getByLabel("Vorname").fill("Paul");
    await page.getByLabel("Nachname").fill("Maier");
    await page.getByLabel("E-Mail-Adresse").fill("paul.maier@example.com");
    await page.getByLabel("Telefon", { exact: true }).fill("0664 7654321");
    await page.getByRole("checkbox", { name: /AGB/ }).check();
    await page.getByRole("button", { name: "Weiter" }).click();

    /* ---- Schritt 5: Bezahlung ---- */
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fast geschafft");
    const stripeElement = page.locator("iframe[name^='__privateStripeFrame'], [data-stripe-element], .StripeElement");
    const mockCard = page.getByRole("radio", { name: /Kreditkarte/ });
    if (await mockCard.count()) {
      await mockCard.check({ force: true });
    } else if (await stripeElement.count()) {
      test.info().annotations.push({ type: "note", description: "Stripe element present – payment step not asserted" });
    }
    await page.getByRole("button", { name: /Jetzt kaufen/ }).click();

    /* ---- Bestellseite ---- */
    await expect(page).toHaveURL(/\/bestellung\/BQ-[A-Z0-9]+\?token=/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Danke");
    await expect(page.getByText("Viel Freude mit den Blumen!")).toBeVisible();
    await expect(page.getByRole("button", { name: /Warenkorb, 0 Artikel/ })).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";
import { ADMIN_PASSWORD } from "./helpers";

/** Admin → Bestellungen: export buttons download CSV/JSON with all data; nothing without login. */
test("Bestellungen exportieren (CSV, Positionen, JSON)", async ({ page, playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL });
  // Without a session the admin guard redirects to the login (the route itself would answer 401).
  const res = await anon.get("/admin/bestellungen/export?format=orders", { maxRedirects: 0 });
  expect([307, 308, 401]).toContain(res.status());
  if (res.status() !== 401) expect(res.headers()["location"]).toContain("/admin/login");
  await anon.dispose();

  await page.goto("/admin/login?next=%2Fadmin%2Fbestellungen");
  await page.locator("input#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/admin\/bestellungen$/);

  const link = page.getByRole("link", { name: /Export Bestellungen \(CSV\)/ });
  await expect(link).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
  expect(download.suggestedFilename()).toMatch(/^blumora-bestellungen-\d{4}-\d{2}-\d{2}\.csv$/);

  const csv = await page.request.get("/admin/bestellungen/export?format=orders");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect((await csv.text()).replace(/^﻿/, "").split("\r\n")[0]).toContain("Bestellnummer;Erstellt;Status;Zahlungsstatus");

  const lines = await page.request.get("/admin/bestellungen/export?format=lines");
  expect((await lines.text()).replace(/^﻿/, "")).toMatch(/^Bestellnummer;Erstellt;Status;Zahlungsstatus;Liefertag/);

  const json = await page.request.get("/admin/bestellungen/export?format=json&status=unpaid");
  const body = await json.json();
  expect(Array.isArray(body.orders)).toBe(true);
  for (const o of body.orders) expect(o.token).toBeUndefined();
});

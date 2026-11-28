import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD } from "./helpers";

/**
 * Partner-Portal (Stufe 1): the admin allow-lists a portal address and records a payment,
 * the partner logs in with the magic link (read from the console-mail outbox, see
 * MAIL_CONSOLE_OUTBOX in playwright.config.ts – no real mail), sees "Offen", confirms a
 * pending order and sees it counted. Unauthenticated /partner shows only the login.
 *
 * Needs the JSON store (DATABASE_URL empty): orders are written to data/orders.json.
 * Uses the partner "blumen-dody" from content/partners.json with a fake address.
 */

const DATA = path.resolve(process.cwd(), "data");
const SHOTS = path.resolve(process.cwd(), "test-results");
const PARTNER = "blumen-dody";
const EMAIL = "portal-e2e@example.com";
const IDS = { done: "BQ-E2EP01", pending: "BQ-E2EP02", unpaid: "BQ-E2EP03", other: "BQ-E2EP04" };
const RUNTIME_DOCS = ["partner-portal", "partner-ledger", "partner-auth-tokens", "mail-outbox"];

async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(DATA, `${name}.json`), "utf8")) as T;
  } catch {
    return fallback;
  }
}
const writeJson = (name: string, value: unknown) => writeFile(path.join(DATA, `${name}.json`), JSON.stringify(value, null, 2) + "\n", "utf8");

function seedOrder(id: string, over: Record<string, unknown>) {
  const at = new Date().toISOString();
  const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  return {
    id, token: `e2e0partner0token0${id.slice(-2)}000`, createdAt: at, status: "paid",
    history: [{ status: "paid", at }],
    recipient: { firstName: "Paula", lastName: "Geheimname", street: "Geheimgasse", houseNumber: "7", zip: "1040", city: "Wien", country: "AT", phone: "+43 660 9999999" },
    delivery: { date: day, windowLabel: "10:00–13:00", windowFrom: "10:00", windowTo: "13:00", zoneId: "wien-zentrum", zoneName: "Wien Zentrum", fee: 0 },
    customer: { firstName: "Otto", lastName: "Orderer", email: "otto.orderer@example.com", phone: "+43 660 1111111" },
    lines: [{ productId: "p-amour", productName: "Amour", sizeId: "l", sizeLabel: "Groß", quantity: 1, unitPrice: 89, image: "/images/products/amour-1.jpg", extras: [], floristBudget: 30, message: "Alles Liebe!", senderName: "Dein Max" }],
    totals: { subtotal: 89, extras: 0, delivery: 0, discount: 0, total: 89 },
    payment: { method: "card", status: "paid", provider: "mock", paidAt: at },
    partner: { id: PARTNER, name: "Blumen Dody", assignedAt: at, sentAt: at, confirmToken: "e2e-confirm-token" },
    locale: "de",
    ...over,
  };
}

/** (Re-)inserts the seeded orders – other specs write data/orders.json in parallel. */
async function ensureOrders() {
  const orders = (await readJson<{ id: string }[]>("orders", [])).filter((o) => !Object.values(IDS).includes(o.id));
  const past = "2026-12-01";
  orders.unshift(
    seedOrder(IDS.done, { status: "delivered", delivery: { date: past, windowLabel: "10:00–13:00", zoneId: "wien-zentrum", zoneName: "Wien Zentrum", fee: 0 }, lines: [{ productId: "p-amour", productName: "Amour", sizeId: "m", sizeLabel: "Mittel", quantity: 1, unitPrice: 69, image: "/x.jpg", extras: [], floristBudget: 40 }], partner: { id: PARTNER, name: "Blumen Dody", assignedAt: "2026-11-30T10:00:00.000Z", sentAt: "2026-11-30T10:00:00.000Z", confirmedAt: "2026-11-30T11:00:00.000Z" } }),
    seedOrder(IDS.pending, { partner: { id: PARTNER, name: "Blumen Dody", assignedAt: new Date().toISOString(), sentAt: new Date().toISOString(), confirmToken: "e2e-confirm-token", note: "Bitte nur weiße Rosen" } }),
    seedOrder(IDS.unpaid, { payment: { method: "card", status: "pending", provider: "mock" } }),
    seedOrder(IDS.other, { partner: { id: "rosenhaus-e2e", name: "Rosenhaus", assignedAt: new Date().toISOString(), sentAt: new Date().toISOString() } }),
  );
  await writeJson("orders", orders);
}

async function adminLogin(page: Page, next: string) {
  await page.goto(`/admin/login?next=${encodeURIComponent(next)}`);
  await page.locator("input#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[/-]/g, "\\$&")}$`));
}

test.describe("Partner-Portal", () => {
  test.skip(Boolean(process.env.DATABASE_URL), "needs the JSON store");
  test.describe.configure({ mode: "serial" });

  const originals = new Map<string, string | null>();
  test.beforeAll(async () => {
    for (const name of RUNTIME_DOCS) originals.set(name, await readFile(path.join(DATA, `${name}.json`), "utf8").catch(() => null));
    await ensureOrders();
  });
  test.afterAll(async () => {
    await writeJson("orders", (await readJson<{ id: string }[]>("orders", [])).filter((o) => !Object.values(IDS).includes(o.id)));
    for (const [name, raw] of originals) {
      if (raw === null) await rm(path.join(DATA, `${name}.json`), { force: true });
      else await writeFile(path.join(DATA, `${name}.json`), raw, "utf8");
    }
  });

  test("ohne Anmeldung nur der Login", async ({ page }) => {
    await page.goto("/partner");
    await expect(page.getByRole("heading", { level: 1, name: "Anmelden" })).toBeVisible();
    await expect(page.getByTestId("partner-open")).toHaveCount(0);
    await expect(page.getByText(IDS.pending)).toHaveCount(0);
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("noindex");
    await page.goto("/partner/anmelden?token=" + "0".repeat(64));
    await expect(page.getByRole("heading", { level: 1, name: "Link nicht gültig" })).toBeVisible();
  });

  test("Admin schaltet Portal-Adresse frei und erfasst eine Zahlung", async ({ page }) => {
    await ensureOrders();
    await adminLogin(page, `/admin/partner-abrechnung/${PARTNER}`);
    await page.getByLabel(/Auftrags-Adressen verwenden/).uncheck();
    await page.getByLabel("Portal-E-Mails").fill(EMAIL);
    await page.getByRole("button", { name: "Portal-Zugang speichern" }).click();
    await expect(page.getByText("Gespeichert: 1 Adresse(n) dürfen sich anmelden.")).toBeVisible();

    await page.locator("#payment-new-amount").fill("10,00");
    await page.locator("#payment-new-note").fill("E2E Überweisung");
    await page.getByRole("button", { name: "Zahlung erfassen" }).click();
    await expect(page.getByText("Zahlung erfasst.")).toBeVisible();
    await page.reload();
    await expect(page.getByText(IDS.done).first()).toBeVisible();
    await expect(page.getByText("E2E Überweisung")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(SHOTS, "partner-admin-390.png"), fullPage: true });
  });

  test("Admin exportiert Partner-Abrechnung (alle Partner, nur offene)", async ({ page }) => {
    await ensureOrders();
    await adminLogin(page, "/admin/partner-abrechnung");
    await page.getByLabel("Zeitraum").selectOption("");
    await page.getByLabel(/nur offene/).check();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportieren" }).click()]);
    expect(download.suggestedFilename()).toBe("blumora-partner-alle-gesamt-offen.csv");
    const csv = await page.request.get(`/admin/partner-abrechnung/export?partner=${PARTNER}&scope=open`);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect((await csv.text()).replace(/^\uFEFF/, "")).toMatch(/^Partner;Bestellnummer;/);
  });

  test("Partner meldet sich per Link an, sieht „Offen“ und bestätigt", async ({ page, request }) => {
    await ensureOrders();
    // Unknown addresses get exactly the same answer (no enumeration).
    const unknown = await request.post("/api/partner/request-link", { data: { email: "nobody-e2e@example.com" } });
    const unknownBody = await unknown.json();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/partner");
    await page.getByLabel("E-Mail-Adresse").fill(EMAIL);
    await page.getByRole("button", { name: "Login-Link senden" }).click();
    const neutral = page.getByText("Falls die Adresse freigeschaltet ist, kommt gleich ein Link.", { exact: false });
    await expect(neutral).toBeVisible();
    expect(unknownBody.message).toBe(await neutral.textContent());

    let link = "";
    await expect.poll(async () => {
      const outbox = await readJson<{ to: string[]; text: string; type?: string }[]>("mail-outbox", []);
      const mail = outbox.find((m) => m.type === "partner_portal_login" && m.to.includes(EMAIL));
      link = mail?.text.match(/https?:\/\/\S+\/partner\/anmelden\?token=[0-9a-f]{64}/)?.[0] ?? "";
      return link;
    }, { timeout: 15_000 }).not.toBe("");
    expect((await readJson<{ to: string[] }[]>("mail-outbox", [])).some((m) => m.to.includes("nobody-e2e@example.com"))).toBe(false);

    await page.goto(new URL(link).pathname + new URL(link).search);
    await page.getByRole("button", { name: "Jetzt anmelden" }).click();
    await expect(page).toHaveURL(/\/partner$/);

    // 40 (confirmed, delivered) − 10 (payment) = 30
    await expect(page.getByTestId("partner-open")).toHaveText(/€\s?30,00$/);
    const pending = page.getByRole("article", { name: `Auftrag ${IDS.pending}` });
    await expect(pending).toBeVisible();
    await expect(pending.getByText("Bitte nur weiße Rosen")).toBeVisible();
    await expect(pending.getByText("Für Paula · 1040 (Wien Zentrum)")).toBeVisible();
    await expect(pending.getByText("Alles Liebe!")).toBeVisible();
    await expect(page.getByText(IDS.unpaid)).toHaveCount(0);
    await expect(page.getByText(IDS.other)).toHaveCount(0);
    for (const secret of ["otto.orderer@example.com", "Orderer", "Geheimgasse", "Geheimname", "+43 660 9999999", "89,00"]) {
      await expect(page.getByText(secret, { exact: false })).toHaveCount(0);
    }
    await expect(page.getByRole("heading", { name: "Erledigt" })).toBeVisible();
    await expect(page.getByText(/Dezember( 2026)?: \d+ (Auftrag|Aufträge) · /)).toBeVisible();

    await pending.getByRole("button", { name: /Bestätigen/ }).click();
    await expect(pending.getByText("Bestätigt")).toBeVisible();
    await page.reload();
    // 40 + 30 − 10 = 60
    await expect(page.getByTestId("partner-open")).toHaveText(/€\s?60,00$/);
    await expect(page.getByRole("article", { name: `Auftrag ${IDS.pending}` }).getByText("Bestätigt")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "partner-dashboard-390.png"), fullPage: true });

    const saved = (await readJson<{ id: string; partner?: { confirmedAt?: string }; history: { note?: string }[] }[]>("orders", [])).find((o) => o.id === IDS.pending);
    expect(saved?.partner?.confirmedAt).toBeTruthy();
    expect(saved?.history.at(-1)?.note).toContain("bestätigt (Partner-Portal)");

    await page.getByRole("button", { name: "Abmelden" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Anmelden" })).toBeVisible();
  });
});

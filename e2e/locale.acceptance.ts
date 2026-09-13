import crypto from "node:crypto";
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const fixture = JSON.parse(fs.readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  runNonce: string; productId: number; buyerAEmail: string; adminDeEmail: string;
};
const api = "http://127.0.0.1:18080";
const password = process.env.E2E_PASSWORD!;

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ request, context }) => {
  const marker = await request.get("http://127.0.0.1:3120/.well-known/shopupu-verification.txt");
  expect(await marker.text()).toBe(fixture.runNonce);
  await context.route("**/*", async (route) => {
    const origin = new URL(route.request().url()).origin;
    if ([api, "http://127.0.0.1:3120", "null"].includes(origin)) await route.continue();
    else await route.abort("blockedbyclient");
  });
});

const languageSelector = (page: Page) => page.getByRole("combobox", { name: /^(Language|Sprache)$/ });

async function chooseGerman(page: Page) {
  await page.goto("/about-demo");
  await languageSelector(page).selectOption("de");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
}

async function signInGerman(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/^E-Mail$/).fill(email);
  await page.getByLabel(/^Passwort$/).fill(password);
  await page.getByRole("button", { name: /^Anmelden$/ }).click();
}

/** RFC 6238 with the enrollment defaults the backend documents: SHA-1, 6 digits, 30-second steps. */
function totp(base32Secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32Secret.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const digest = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

// Included only by --require-de. This is a mandatory future release contract, not a skipped DE PASS.
for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`language switch persists EN/DE and updates document semantics at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/about-demo");
    await languageSelector(page).selectOption("de");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.locator("main")).toContainText(/erfunden/i);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await page.goto("/login");
    await expect(page.getByLabel(/^E-Mail$/)).toBeVisible();
    await expect(page.getByLabel(/^Passwort$/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Anmelden$/ })).toBeVisible();
    await languageSelector(page).selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByLabel(/^Password$/)).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
}

let germanPaymentId: number | undefined;
let germanOrderId: number | undefined;

test("German checkout keeps API values while every step, amount and outcome is translated", async ({ page }) => {
  await chooseGerman(page);
  await page.goto(`/products/${fixture.productId}`);
  await expect(page.getByRole("complementary", { name: "Hinweis zum Demo-Shop" })).toContainText(/erfunden/i);
  await expect(page.getByText("Erfundenes Demo-Produkt · nicht zum Verkauf", { exact: true })).toBeVisible();
  await expect(page.getByText("Generierte Beispielbewertung", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^In den Warenkorb$/ }).click();
  await expect(page.getByText(/^Zum Warenkorb hinzugefügt/)).toBeVisible();
  await signInGerman(page, fixture.buyerAEmail);
  await expect(page.getByRole("link", { name: /^Konto$/ })).toBeVisible();
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Prüfe deine Bestellung." })).toBeVisible();
  await expect(page.locator("main")).toContainText("19,00 €");
  await page.getByRole("button", { name: /^Bestellung aufgeben$/ }).click();
  await page.waitForURL(/\/checkout\/shipping\?orderId=\d+/);
  germanOrderId = Number(new URL(page.url()).searchParams.get("orderId"));
  await expect(page.getByRole("heading", { name: "Wohin soll es gehen?" })).toBeVisible();
  for (const [label, value] of [["Vollständiger Name", "Fiktive Käuferin"], ["Adresszeile 1", "Teststraße 1"],
    ["Ort", "Berlin"], ["Bundesland", "Berlin"], ["Postleitzahl", "10115"], ["Land", "Deutschland"]]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  // The radio keeps its API value even though its label is translated.
  await expect(page.getByLabel("Standardversand (Demo)")).toHaveAttribute("value", "STANDARD_POST");
  await page.getByRole("button", { name: /^Versand speichern$/ }).click();
  await page.getByRole("link", { name: /^Weiter zur Zahlung$/ }).click();
  await page.waitForURL(/\/checkout\/payment\?orderId=\d+/);
  await expect(page.getByRole("heading", { name: "Probiere eine Testzahlung aus." })).toBeVisible();
  await expect(page.locator("main")).toContainText("Dies ist eine lokale Simulation");
  const created = page.waitForResponse((response) => response.url() === `${api}/api/v1/payments` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Lokale Zahlungssimulation ausprobieren", exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const payment = await response.json() as { id: number; status: string; provider: string };
  expect(payment.provider).toBe("stub");
  expect(payment.status).toBe("PENDING");
  germanPaymentId = payment.id;
  await page.goto(`/payment/${payment.id}`);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("heading", { name: "Bestätigung ausstehend." })).toBeVisible();
  await page.getByRole("button", { name: "Erfolgreiche Zahlung simulieren", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zahlung erfolgreich." })).toBeVisible();
  await expect(page.locator("main")).toContainText("kein echtes Geld");
  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "Bestellungen." })).toBeVisible();
  await expect(page.locator("main")).toContainText("bezahlt");
});

test("German back office: privileged enrollment, navigation, order details and refund panel are translated", async ({ page }) => {
  test.setTimeout(90_000);
  expect(germanPaymentId, "the German checkout must have produced a payment").toBeDefined();
  expect(germanOrderId, "the German checkout must have produced an order").toBeDefined();
  await chooseGerman(page);
  await signInGerman(page, fixture.adminDeEmail);
  await expect(page.getByRole("heading", { name: "Richte deinen Authenticator ein." })).toBeVisible();
  await page.getByRole("button", { name: "Einrichtungsschlüssel anzeigen", exact: true }).click();
  const secret = (await page.getByLabel("Authenticator-Einrichtungsschlüssel").textContent())?.trim() ?? "";
  expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
  await page.getByLabel("Authenticator-Code").fill(totp(secret));
  await page.getByRole("button", { name: "Code bestätigen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Speichere deine Wiederherstellungscodes." })).toBeVisible();
  const codes = (await page.getByLabel("Wiederherstellungscodes", { exact: true }).textContent())?.trim().split("\n") ?? [];
  expect(codes).toHaveLength(10);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Weiter zum Shop", exact: true }).click();
  await expect(page.getByRole("link", { name: /^Verwaltung$/ })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Backoffice" })).toBeVisible();
  const sections = page.getByRole("navigation", { name: "Verwaltungsbereiche" });
  for (const label of ["Produkte", "Kategorien", "Bestellungen", "Bewertungen", "Aktionscodes", "Benutzer", "KI"]) {
    await expect(sections.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Bestellungen" })).toBeVisible();
  await expect(page.getByLabel("Status")).toContainText("Zahlung ausstehend");
  await expect(page.locator("table")).toContainText("bezahlt");
  await expect(page.locator("table").getByRole("link", { name: "Öffnen" }).first()).toBeVisible();
  // The HTTP smoke leaves earlier orders behind; open the order this German checkout created.
  await page.goto(`/admin/orders/${germanOrderId}`);
  await expect(page.getByRole("heading", { name: /^Bestellung ORD-/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Statusverlauf" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Zahlung ausstehend → bezahlt");
  await expect(page.getByRole("heading", { name: "Testerstattung" })).toBeVisible();
  await page.getByLabel("Zahlungs-ID").fill(String(germanPaymentId));
  await page.getByRole("button", { name: "Zahlung laden", exact: true }).click();
  await expect(page.getByText(`Zahlung #${germanPaymentId}: erfolgreich`)).toBeVisible();
  await page.getByRole("button", { name: "Testzahlung erstatten", exact: true }).click();
  await expect(page.getByText("Testerstattung bestätigt.", { exact: true })).toBeVisible();
  await expect(page.getByText(`Zahlung #${germanPaymentId}: erstattet`)).toBeVisible();
  await expect(page.locator("main")).toContainText("bezahlt → erstattet");
  await page.goto("/admin/products/new");
  await expect(page.getByRole("heading", { name: "Neues Produkt" })).toBeVisible();
  await page.getByLabel("Titel", { exact: true }).fill("A");
  await page.getByRole("button", { name: "Produkt erstellen", exact: true }).click();
  await expect(page.getByText("Der Titel muss mindestens 2 Zeichen enthalten.", { exact: true })).toBeVisible();
});

import crypto from "node:crypto";
import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const fixture = JSON.parse(fs.readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  runNonce: string; productId: number; buyerAEmail: string; adminA11yEmail: string;
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

/** WCAG 2.x A/AA rules only; best-practice rules are advisory and stay out of the gate. */
async function expectNoWcagViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map((v) =>
    `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, `${label}: axe violations`).toEqual([]);
}

/** 1.4.10 reflow: no page may force horizontal scrolling at a 320 CSS px width. */
async function expectNoHorizontalOverflow(page: Page, label: string) {
  const width = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth
  }));
  expect(width.doc, `${label}: document wider than the viewport`).toBeLessThanOrEqual(width.viewport);
}

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

const publicPages = ["/", "/catalog", `/products/${fixture.productId}`, "/login", "/register", "/cart", "/about-demo", "/privacy"];

test("public pages pass WCAG A/AA automated checks at desktop width", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const path of publicPages) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoWcagViolations(page, path);
  }
});

test("public and checkout pages reflow at 320px without horizontal scrolling", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of publicPages) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoHorizontalOverflow(page, path);
  }
  // A signed-in customer's private pages must reflow as well.
  await page.goto("/login");
  await page.getByLabel(/^Email$/).fill(fixture.buyerAEmail);
  await page.getByLabel(/^Password$/).fill(password);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await expect(page.getByRole("link", { name: /^Account$/ })).toBeVisible();
  for (const path of ["/orders", "/profile", "/checkout"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoHorizontalOverflow(page, path);
    await expectNoWcagViolations(page, `${path}@320`);
  }
});

test("sign-in and add-to-cart are operable with the keyboard alone", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/login");
  const email = page.getByLabel(/^Email$/);
  await email.focus();
  await page.keyboard.type(fixture.buyerAEmail);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(/^Password$/)).toBeFocused();
  await page.keyboard.type(password);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: /^Account$/ })).toBeVisible();

  await page.goto(`/products/${fixture.productId}`);
  const addToCart = page.getByRole("button", { name: /^Add to cart$/ });
  await expect(addToCart).toBeVisible();
  // Tab from the top of the document until the primary action receives focus; every stop must be visible.
  await page.locator("body").press("Tab");
  for (let stops = 0; stops < 60; stops++) {
    if (await addToCart.evaluate((el) => el === document.activeElement)) break;
    const focused = page.locator(":focus");
    await expect(focused, "keyboard focus must never land on an invisible element").toBeVisible();
    await page.keyboard.press("Tab");
  }
  await expect(addToCart).toBeFocused();
  const focusRing = await addToCart.evaluate((el) => {
    const style = getComputedStyle(el);
    return { outline: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
  });
  expect(focusRing.outline !== "none" || focusRing.boxShadow !== "none", `focus must be visible: ${JSON.stringify(focusRing)}`).toBeTruthy();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/^Added to cart/)).toBeVisible();
});

test("a failed add-to-cart is reported and succeeds on retry once the server recovers", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let faults = 1;
  await page.route(`${api}/api/v1/cart/items`, async (route) => {
    if (route.request().method() === "POST" && faults-- > 0) {
      await route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        body: JSON.stringify({ status: 503, title: "Service Unavailable", detail: "Simulated outage", code: "SERVICE_UNAVAILABLE", requestId: "e2e-fault" })
      });
      return;
    }
    await route.continue();
  });
  await page.goto(`/products/${fixture.productId}`);
  const addToCart = page.getByRole("button", { name: /^Add to cart$/ });
  await addToCart.click();
  await expect(page.locator(".errorText")).toBeVisible();
  await expect(page.getByText(/^Added to cart/)).toHaveCount(0);
  await addToCart.click();
  await expect(page.getByText(/^Added to cart/)).toBeVisible();
  expect(faults).toBeLessThanOrEqual(0);
});

test("the back office is usable at 390px: enrollment, navigation, orders and product form", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel(/^Email$/).fill(fixture.adminA11yEmail);
  await page.getByLabel(/^Password$/).fill(password);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await expect(page.getByRole("heading", { name: "Set up your authenticator." })).toBeVisible();
  await expectNoHorizontalOverflow(page, "mfa enrollment@390");
  await expectNoWcagViolations(page, "mfa enrollment@390");
  await page.getByRole("button", { name: "Show setup key", exact: true }).click();
  const secret = (await page.getByLabel("Authenticator setup key").textContent())?.trim() ?? "";
  expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
  await page.getByLabel("Authenticator code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Save your recovery codes." })).toBeVisible();
  await expectNoHorizontalOverflow(page, "recovery codes@390");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to store", exact: true }).click();
  await expect(page.getByRole("link", { name: /^Admin$/ })).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Back office" })).toBeVisible();
  const sections = page.getByRole("navigation", { name: "Admin sections" });
  for (const label of ["Products", "Categories", "Orders", "Reviews", "Promos", "Users"]) {
    const link = sections.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box, `${label} link has a box`).not.toBeNull();
    expect(box!.x + box!.width, `${label} link stays inside the 390px viewport`).toBeLessThanOrEqual(390);
  }
  await expectNoHorizontalOverflow(page, "/admin@390");
  await expectNoWcagViolations(page, "/admin@390");

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await expect(page.locator("table").getByRole("link", { name: "Open" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "/admin/orders@390");
  // Rows reflow into stacked cards on phones: the first row's identity and action must sit inside the viewport.
  const firstRow = page.locator("table tbody tr").first();
  await expect(firstRow.locator("td").first()).toContainText(/^ORD-/);
  for (const cell of await firstRow.locator("td").all()) {
    const box = await cell.boundingBox();
    if (!box) continue;
    expect(box.x, "a cell must not start off-screen").toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, "a cell must end inside the 390px viewport").toBeLessThanOrEqual(390);
  }
  const open = firstRow.getByRole("link", { name: "Open" });
  await expect(open).toBeVisible();
  const openBox = (await open.boundingBox())!;
  expect(openBox.height, "the row action keeps a touch-friendly height").toBeGreaterThanOrEqual(32);
  await expectNoWcagViolations(page, "/admin/orders@390");

  await page.goto("/admin/products/new");
  await expect(page.getByRole("heading", { name: "New product" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "/admin/products/new@390");
  await expectNoWcagViolations(page, "/admin/products/new@390");
});

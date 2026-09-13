import fs from "node:fs";
import { expect, test, type APIRequestContext, type Page, type Request } from "@playwright/test";

const fixture = JSON.parse(fs.readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  runNonce: string; productId: number; productSlug: string; variantId: number;
  buyerAEmail: string; buyerBEmail: string;
};
const api = "http://127.0.0.1:18080";
const password = process.env.E2E_PASSWORD!;

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ request, context }) => {
  const proof = await request.get(`${api}/api/v1/catalog/products/${fixture.productId}`);
  expect(proof.ok()).toBeTruthy();
  expect((await proof.json()).slug).toBe(fixture.productSlug);
  const marker = await request.get("http://127.0.0.1:3120/.well-known/shopupu-verification.txt");
  expect(await marker.text()).toBe(fixture.runNonce);
  // Browser traffic stays inside the owned stack. No Stripe/Google/AI connection is allowed here.
  await context.route("**/*", async (route) => {
    const origin = new URL(route.request().url()).origin;
    if ([api, "http://127.0.0.1:3120", "null"].includes(origin)) await route.continue();
    else await route.abort("blockedbyclient");
  });
});

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/^Email$/).fill(email);
  await page.getByLabel(/^Password$/).fill(password);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await expect(page.getByRole("link", { name: /^Account$/ })).toBeVisible();
}

async function token(request: APIRequestContext, email: string) {
  const response = await request.post(`${api}/api/v1/auth/login`, { data: { email, password } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { status: string; accessToken: string };
  expect(body.status).toBe("AUTHENTICATED");
  return body.accessToken;
}

test("public pages disclose fictional products and synthetic reviews; absent products are semantic 404s", async ({ page }) => {
  await page.goto(`/products/${fixture.productId}`);
  await expect(page.getByRole("complementary", { name: "Demo store notice" })).toContainText(/fictional/i);
  await expect(page.getByText("Synthetic sample review", { exact: true })).toBeVisible();
  await expect(page.getByText(/Synthetic acceptance review/)).toContainText("<img");
  expect(await page.evaluate(() => (window as Window & { __acceptanceInjection?: number }).__acceptanceInjection)).toBeUndefined();
  await page.goto("/about-demo");
  await expect(page.getByRole("heading", { name: "Payments without real money" })).toBeVisible();
  const missing = await page.goto("/products/2147483000");
  expect(missing?.status()).toBe(404);
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
});

test("guest cart merges on login and checkout completes through the owner-only local simulation", async ({ page, request }) => {
  await page.goto(`/products/${fixture.productId}`);
  await page.getByRole("button", { name: /^Add to cart$/ }).click();
  // The confirmation is one text node "Added to cart ·" followed by the cart link.
  await expect(page.getByText(/^Added to cart/)).toBeVisible();
  await signIn(page, fixture.buyerAEmail);
  await page.goto("/checkout");
  await expect(page.locator("table")).toContainText("Acceptance Tee");
  await page.getByRole("button", { name: /^Place order$/ }).click();
  await page.waitForURL(/\/checkout\/shipping\?orderId=\d+/);
  for (const [label, value] of [["Full name", "Fictional Buyer"], ["Address line 1", "Teststrasse 1"],
    ["City", "Berlin"], ["State", "Berlin"], ["Postal code", "10115"], ["Country", "DE"]]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: /^Save shipping$/ }).click();
  await page.getByRole("link", { name: /^Continue to payment$/ }).click();
  const created = page.waitForResponse((response) => response.url() === `${api}/api/v1/payments` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Try local payment simulation", exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const payment = await response.json() as { id: number; provider: string; status: string; orderId: number };
  expect(payment.provider).toBe("stub");
  expect(payment.status).toBe("PENDING");
  const other = await token(request, fixture.buyerBEmail);
  const denied = await request.post(`${api}/api/v1/payments/${payment.id}/simulate-success`, { headers: { Authorization: `Bearer ${other}` } });
  expect(denied.status()).toBe(403);
  expect(await denied.json()).not.toHaveProperty("externalPaymentId");
  await page.goto(`/payment/${payment.id}`);
  await page.getByRole("button", { name: "Simulate a successful payment", exact: true }).click();
  await expect(page.getByText(/The test payment succeeded/)).toBeVisible();
  await expect(page.getByText(/No real money was charged/)).toBeVisible();
  expect(new URL(page.url()).origin).toBe("http://127.0.0.1:3120");
});

test("customer role cannot enter the admin surface", async ({ page, request }) => {
  await signIn(page, fixture.buyerBEmail);
  await page.goto("/admin/orders");
  await expect(page.getByRole("link", { name: /^Admin$/ })).toHaveCount(0);
  const buyer = await token(request, fixture.buyerBEmail);
  const denied = await request.get(`${api}/api/v1/admin/orders`, { headers: { Authorization: `Bearer ${buyer}` } });
  expect(denied.status()).toBe(403);
  const body = await denied.json();
  expect(body.code).toBeTruthy();
  expect(body.requestId).toBeTruthy();
  expect(body).not.toHaveProperty("content");
});

test("a late identity response for A cannot replace B after a real cross-tab switch", async ({ page, context, request }) => {
  for (const [email, firstName] of [[fixture.buyerAEmail, "Account A"], [fixture.buyerBEmail, "Account B"]]) {
    const access = await token(request, email);
    const response = await request.put(`${api}/api/v1/users/me/profile`, { headers: { Authorization: `Bearer ${access}` }, data: { firstName } });
    expect(response.ok()).toBeTruthy();
  }
  await signIn(page, fixture.buyerAEmail);
  const otherTab = await context.newPage();
  await otherTab.goto("/profile");
  await expect(otherTab.getByLabel("First name", { exact: true })).toHaveValue("Account A");
  await page.goto("/profile");
  // Let the restored session finish rendering first: reloading while the refresh is still in flight
  // would abort it and the test would then measure the abort, not the delayed identity response.
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Account A");
  let captured!: () => void;
  let release!: () => void;
  const capturedResponse = new Promise<void>((resolve) => { captured = resolve; });
  const releaseResponse = new Promise<void>((resolve) => { release = resolve; });
  let delayedRequest: Request | undefined;
  await page.route(`${api}/api/v1/auth/me`, async (route) => {
    const response = await route.fetch();
    if (!delayedRequest && response.status() === 200 && (await response.json()).email === fixture.buyerAEmail) {
      delayedRequest = route.request();
      captured();
      await releaseResponse;
    }
    await route.fulfill({ response });
  });
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await capturedResponse;
    await otherTab.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(otherTab.getByRole("banner").getByRole("link", { name: /^Sign in$/ })).toBeVisible();
    await signIn(otherTab, fixture.buyerBEmail);
    // Match the delayed response by request identity: the app discards it without reading the body,
    // so waiting on response.json() here would hang on a body nobody consumes.
    const delivered = page.waitForResponse((response) => response.request() === delayedRequest);
    release();
    await delivered;
    await expect(page.getByRole("link", { name: /^Account$/ })).toHaveAttribute("title", fixture.buyerBEmail);
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Account B");
    await expect(page.getByLabel("First name", { exact: true })).not.toHaveValue("Account A");
  } finally { release(); }
});

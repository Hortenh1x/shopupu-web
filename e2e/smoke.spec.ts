import crypto from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke of the whole buying path against the real local backend:
 * catalog -> product -> guest cart -> register (guest cart merges) ->
 * checkout -> shipping -> stub payment (PENDING).
 *
 * The stub provider leaves payments PENDING until the backend receives a
 * signed provider callback. When E2E_PAYMENT_CALLBACK_SECRET is set (matching
 * the backend's payments.callback-secret) the test signs that callback itself
 * and asserts the payment page flips to "succeeded". Without the secret the
 * callback leg is skipped — the backend rejects unsigned callbacks by design.
 */
const callbackSecret = process.env.E2E_PAYMENT_CALLBACK_SECRET;
// Where to POST the signed callback; may be a second backend instance that
// shares the database (useful when the main one runs without the secret).
const callbackBase = process.env.E2E_CALLBACK_API_BASE_URL ?? "http://localhost:8080";

async function addFirstAvailableProduct(page: Page) {
  // the first few cards may be sold out; find one whose Add to cart enables
  for (let index = 0; index < 4; index += 1) {
    await page.goto("/catalog");
    // the product link uses display:contents, so target the card's title box
    const cards = page.locator("article.productCard");
    await expect(cards.first()).toBeVisible();
    if ((await cards.count()) <= index) break;
    await cards.nth(index).locator(".productTitle").click();
    await page.waitForURL(/\/products\/\d+/);
    const addToCart = page.getByRole("button", { name: "Add to cart" });
    await addToCart.waitFor();
    if (await addToCart.isEnabled()) {
      const title = (await page.locator("h1").first().textContent())?.trim() ?? "";
      await addToCart.click();
      await expect(page.getByText("Added to cart")).toBeVisible();
      return title;
    }
  }
  throw new Error("No purchasable product found on the first catalog page");
}

test("guest browses, registers, checks out and pays via the stub provider", async ({ page, request }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "E2ePassw0rd!";

  const title = await addFirstAvailableProduct(page);

  // the guest cart holds the item
  await page.goto("/cart");
  await expect(page.locator("table")).toContainText(title);

  // register a fresh account; the backend merges the guest cart (CART-02)
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("link", { name: "Go to catalog" })).toBeVisible();

  // the merged cart reaches checkout
  await page.goto("/checkout");
  await expect(page.locator("table")).toContainText(title);
  await page.getByRole("button", { name: "Place order" }).click();

  // shipping step
  await page.waitForURL(/\/checkout\/shipping\?orderId=\d+/);
  await page.getByLabel("Full name").fill("E2E Buyer");
  await page.getByLabel("Address line 1").fill("Teststrasse 1");
  await page.getByLabel("City").fill("Berlin");
  await page.getByLabel("State").fill("Berlin");
  await page.getByLabel("Postal code").fill("10115");
  // Country is prefilled with Germany; STANDARD_POST is the default method
  await page.getByRole("button", { name: "Save shipping" }).click();
  await page.getByRole("link", { name: "Continue to payment" }).click();

  // payment step: create the stub payment
  await page.waitForURL(/\/checkout\/payment\?orderId=\d+/);
  const paymentCreated = page.waitForResponse(
    (response) => response.url().includes("/api/v1/payments") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Pay now" }).click();
  const payment = (await (await paymentCreated).json()) as {
    id: number;
    status: string;
    externalPaymentId: string;
  };
  expect(payment.status).toBe("PENDING");
  expect(payment.externalPaymentId).toContain("stub-payment-");

  // the status page polls while the payment is pending
  await page.getByRole("link", { name: "Track payment status" }).click();
  await page.waitForURL(/\/payment\/\d+/);
  await expect(page.getByText("Waiting for confirmation.")).toBeVisible();

  if (!callbackSecret) {
    test.info().annotations.push({
      type: "note",
      description: "E2E_PAYMENT_CALLBACK_SECRET not set - stub payment left PENDING, callback leg skipped"
    });
    return;
  }

  // sign the provider callback ourselves and watch the UI flip to succeeded
  const payload = JSON.stringify({
    externalEventId: `e2e-${payment.externalPaymentId}`,
    externalPaymentId: payment.externalPaymentId,
    status: "SUCCEEDED",
    details: "e2e stub confirmation"
  });
  const signature = crypto.createHmac("sha256", callbackSecret).update(payload).digest("hex");
  const callback = await request.post(`${callbackBase}/api/v1/payments/callback`, {
    headers: { "Content-Type": "application/json", "X-Payment-Signature": signature },
    data: payload
  });
  expect(callback.status()).toBe(204);

  // the page refetches every 3s while pending
  await expect(page.getByText(/Payment succeeded|succeeded/i).first()).toBeVisible({ timeout: 15_000 });
});

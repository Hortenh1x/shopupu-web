import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutPage } from "@/features/orders/CheckoutPage";
import { clearSession } from "@/lib/auth/session";
import { installFetchMock, jsonResponse, type RecordedRequest } from "@/test/fetchMock";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() })
}));

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: 1, email: "buyer@example.com", enabled: true, emailVerified: true, roles: ["USER"] },
    isReady: true,
    isAuthenticated: true,
    isAdmin: false,
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    reloadUser: vi.fn()
  })
}));

const cart = {
  items: [
    { variantId: 5, productId: 2, title: "Tangerine Tee", sku: "T-1", size: "M", color: "Orange", price: 25, quantity: 2, lineTotal: 50 }
  ],
  totalItems: 2,
  subtotal: 50
};

function renderCheckout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckoutPage />
    </QueryClientProvider>
  );
}

describe("CheckoutPage promo + checkout", () => {
  beforeEach(() => {
    clearSession();
    push.mockClear();
  });

  it("applies a promo code and checks out with it plus a fresh idempotency key", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/cart", () => jsonResponse(200, cart));
    mock.on("POST", "/api/v1/promo/validate", () =>
      jsonResponse(200, { code: "SAVE10", promoType: "PERCENT", discount: 5 })
    );
    let checkoutRequest: RecordedRequest | undefined;
    mock.on("POST", "/api/v1/orders/checkout", (request) => {
      checkoutRequest = request;
      return jsonResponse(200, { id: 7, orderNumber: "SU-7", status: "CREATED", items: [] });
    });

    renderCheckout();
    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("PROMO2026"), "SAVE10");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText(/SAVE10/);

    await user.click(screen.getByRole("button", { name: "Place order" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/checkout/shipping?orderId=7"));

    expect(mock.sent("POST", "/api/v1/promo/validate")[0].body).toEqual({ code: "SAVE10" });
    expect(checkoutRequest?.body).toEqual({ promoCode: "SAVE10" });
    expect(checkoutRequest?.headers.get("Idempotency-Key")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("surfaces the backend problem detail when the promo is rejected", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/cart", () => jsonResponse(200, cart));
    mock.on("POST", "/api/v1/promo/validate", () =>
      jsonResponse(400, { status: 400, detail: "Promo code expired" })
    );

    renderCheckout();
    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("PROMO2026"), "OLDCODE");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByText("Promo code expired")).toBeInTheDocument();
  });

  it("checks out without a promo code when none was applied", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/cart", () => jsonResponse(200, cart));
    let checkoutRequest: RecordedRequest | undefined;
    mock.on("POST", "/api/v1/orders/checkout", (request) => {
      checkoutRequest = request;
      return jsonResponse(200, { id: 8, orderNumber: "SU-8", status: "CREATED", items: [] });
    });

    renderCheckout();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Place order" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/checkout/shipping?orderId=8"));

    expect(checkoutRequest?.body).toEqual({ promoCode: null });
  });
});

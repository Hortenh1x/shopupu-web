import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutPage } from "@/features/orders/CheckoutPage";
import { ShippingPage } from "@/features/shipping/ShippingPage";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { clearSession, setTokens } from "@/lib/auth/session";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }), useSearchParams: () => new URLSearchParams("orderId=7") }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: 1, roles: ["CUSTOMER"] }, isReady: true, isAuthenticated: true, isAdmin: false }) }));
beforeEach(async () => { await clearSession(); setTokens({ accessToken: "a-access", refreshToken: "a-refresh" }); push.mockClear(); });
function mount(component: React.ReactNode) { return render(<LocaleProvider initialLocale="de"><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{component}</QueryClientProvider></LocaleProvider>); }

describe("German commerce keeps API values unchanged", () => {
  it("formats euros in German and submits the same checkout payload/idempotency header", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/cart", () => jsonResponse(200, { items: [{ variantId: 5, productId: 2, title: "Fictional Tee", sku: "T-1", size: "M", price: 1234.5, quantity: 1, lineTotal: 1234.5 }], totalItems: 1, subtotal: 1234.5 }));
    mock.on("POST", "/api/v1/orders/checkout", () => jsonResponse(200, { id: 7, orderNumber: "SU-7", status: "CREATED", items: [] }));
    mount(<CheckoutPage />);
    const submit = await screen.findByRole("button", { name: "Bestellung aufgeben" });
    expect(screen.getAllByText(/1\.234,50\s*€/).length).toBeGreaterThan(0);
    expect(screen.getByText("Fictional Tee")).toBeInTheDocument();
    fireEvent.click(submit);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout/shipping?orderId=7"));
    const request = mock.sent("POST", "/api/v1/orders/checkout")[0];
    expect(request.body).toEqual({ promoCode: null });
    expect(request.headers.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("translates shipping labels and validation without translating the method value", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/orders/7", () => jsonResponse(200, { id: 7, orderNumber: "SU-7", subtotalAmount: 10, shippingAmount: 0, discountAmount: 0, paymentAmount: 10 }));
    mock.on("GET", "/api/v1/users/me/addresses", () => jsonResponse(200, []));
    mount(<ShippingPage />);
    expect(screen.getByLabelText("Standardversand (Demo)")).toHaveAttribute("value", "STANDARD_POST");
    fireEvent.click(screen.getByRole("button", { name: "Versand speichern" }));
    expect((await screen.findAllByText("Verwende mindestens 2 Zeichen.")).length).toBeGreaterThan(0);
    expect(mock.sent("POST", "/api/v1/shipping/address")).toHaveLength(0);
  });
});

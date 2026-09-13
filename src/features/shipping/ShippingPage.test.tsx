import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShippingPage } from "@/features/shipping/ShippingPage";
import { clearSession, setTokens } from "@/lib/auth/session";
import { shippingApi } from "@/lib/api/shop";
import type { Shipment } from "@/lib/api/types";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("orderId=7") }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: 1 }, isReady: true, isAuthenticated: true, isAdmin: false }) }));
beforeEach(async () => { await clearSession(); setTokens({ accessToken: "access-a", refreshToken: "refresh-a" }); });

describe("shipping operation identity", () => {
  it("does not execute A's second shipping request as B", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/orders/7", () => jsonResponse(200, { id: 7, orderNumber: "SU-7", subtotalAmount: 10, shippingAmount: 0, discountAmount: 0, paymentAmount: 10 }));
    mock.on("GET", "/api/v1/users/me/addresses", () => jsonResponse(200, []));
    let release!: (value: Shipment) => void;
    const address = vi.spyOn(shippingApi, "setAddress").mockImplementation(() => new Promise<Shipment>((resolve) => { release = resolve; }));
    const method = vi.spyOn(shippingApi, "setMethod");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ShippingPage /></QueryClientProvider>);
    for (const [label, value] of [["Full name", "Demo Buyer"], ["Address line 1", "Fictional Street 1"], ["City", "Berlin"], ["State", "Berlin"], ["Postal code", "10115"]]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Save shipping" }));
    await waitFor(() => expect(address).toHaveBeenCalledTimes(1));
    await act(async () => { await clearSession(); setTokens({ accessToken: "access-b", refreshToken: "refresh-b" }); release({} as Shipment); });
    await screen.findByText("Your session changed. Please try again.");
    expect(method).not.toHaveBeenCalled();
    address.mockRestore(); method.mockRestore();
  });
});

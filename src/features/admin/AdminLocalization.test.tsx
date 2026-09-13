import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";
import { AdminRefundPanel } from "./AdminRefundPanel";
import { ProductForm } from "./ProductForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

function germanView(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<LocaleProvider initialLocale="de"><QueryClientProvider client={client}>{children}</QueryClientProvider></LocaleProvider>);
  return userEvent.setup();
}

describe("German admin controls preserve their API contracts", () => {
  it("explains an unknown refund without offering another attempt", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/payments/12", () => jsonResponse(200, { id: 12, orderId: 7, status: "SUCCEEDED", refundStatus: "UNKNOWN", refundOperationKey: "pending-operation" }));
    const user = germanView(<AdminRefundPanel orderId={7} />);
    await user.type(screen.getByLabelText("Zahlungs-ID"), "12");
    await user.click(screen.getByRole("button", { name: "Zahlung laden" }));
    await screen.findByText(/Die Bestätigung der Erstattung steht noch aus/);
    expect(screen.queryByRole("button", { name: "Testzahlung erstatten" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fehlgeschlagene Testerstattung wiederholen" })).not.toBeInTheDocument();
    expect(mock.sent("POST", "/api/v1/admin/payments/12/refund")).toHaveLength(0);
  });

  it("sends the original failed operation key from the German explicit retry control", async () => {
    const mock = installFetchMock();
    let complete = false;
    const payment = () => ({ id: 12, orderId: 7, status: complete ? "REFUNDED" : "SUCCEEDED", refundStatus: complete ? "SUCCEEDED" : "FAILED", refundOperationKey: "failed-key" });
    mock.on("GET", "/api/v1/payments/12", () => jsonResponse(200, payment()));
    mock.on("POST", "/api/v1/admin/payments/12/refund/retry", () => { complete = true; return jsonResponse(200, payment()); });
    const user = germanView(<AdminRefundPanel orderId={7} />);
    await user.type(screen.getByLabelText("Zahlungs-ID"), "12");
    await user.click(screen.getByRole("button", { name: "Zahlung laden" }));
    await user.click(await screen.findByRole("button", { name: "Fehlgeschlagene Testerstattung wiederholen" }));
    await screen.findByText("Testerstattung bestätigt.");
    expect(mock.sent("POST", "/api/v1/admin/payments/12/refund/retry")[0].body).toEqual({ failedOperationKey: "failed-key" });
  });

  it("renders German validation while keeping the product title length rule", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/catalog/categories", () => jsonResponse(200, []));
    const user = germanView(<ProductForm />);
    await user.type(screen.getByLabelText("Titel", { exact: true }), "A");
    await user.click(screen.getByRole("button", { name: "Produkt erstellen" }));
    await screen.findByText("Der Titel muss mindestens 2 Zeichen enthalten.");
    expect(mock.sent("POST", "/api/v1/admin/catalog/products")).toHaveLength(0);
  });
});

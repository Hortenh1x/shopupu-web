import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AdminRefundPanel } from "./AdminRefundPanel";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";

function setup(orderId = 7) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><AdminRefundPanel orderId={orderId} /></QueryClientProvider>);
  return userEvent.setup();
}

describe("admin refund confirmation", () => {
  it("keeps an uncertain refund pending instead of claiming success or allowing a second refund", async () => {
    const mock = installFetchMock();
    let pending = false;
    const payment = () => ({ id: 12, orderId: 7, status: "SUCCEEDED", refundStatus: pending ? "UNKNOWN" : null, refundOperationKey: pending ? "operation-1" : null });
    mock.on("GET", "/api/v1/payments/12", () => jsonResponse(200, payment()));
    mock.on("POST", "/api/v1/admin/payments/12/refund", () => { pending = true; return jsonResponse(503, { code: "REFUND_OUTCOME_UNKNOWN", detail: "Refund result is unknown" }); });
    const user = setup();
    await user.type(screen.getByLabelText("Payment ID"), "12");
    await user.click(screen.getByRole("button", { name: "Load payment" }));
    await user.click(await screen.findByRole("button", { name: "Refund test payment" }));
    await screen.findByText(/Refund confirmation is pending/);
    expect(screen.queryByText("Test refund confirmed.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refund test payment" })).not.toBeInTheDocument();
    expect(mock.sent("POST", "/api/v1/admin/payments/12/refund")).toHaveLength(1);
  });

  it("binds explicit retry to the confirmed failed operation", async () => {
    const mock = installFetchMock();
    let complete = false;
    const payment = () => ({ id: 12, orderId: 7, status: complete ? "REFUNDED" : "SUCCEEDED", refundStatus: complete ? "SUCCEEDED" : "FAILED", refundOperationKey: "failed-operation-1" });
    mock.on("GET", "/api/v1/payments/12", () => jsonResponse(200, payment()));
    mock.on("POST", "/api/v1/admin/payments/12/refund/retry", () => { complete = true; return jsonResponse(200, payment()); });
    const user = setup();
    await user.type(screen.getByLabelText("Payment ID"), "12");
    await user.click(screen.getByRole("button", { name: "Load payment" }));
    await user.click(await screen.findByRole("button", { name: "Retry failed test refund" }));
    await screen.findByText("Test refund confirmed.");
    expect(mock.sent("POST", "/api/v1/admin/payments/12/refund/retry")[0].body).toEqual({ failedOperationKey: "failed-operation-1" });
  });

  it("does not offer a refund for a payment from another order", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/payments/12", () => jsonResponse(200, { id: 12, orderId: 99, status: "SUCCEEDED" }));
    const user = setup();
    await user.type(screen.getByLabelText("Payment ID"), "12");
    await user.click(screen.getByRole("button", { name: "Load payment" }));
    await screen.findByText(/belongs to a different order/);
    expect(screen.queryByRole("button", { name: "Refund test payment" })).not.toBeInTheDocument();
  });
});
